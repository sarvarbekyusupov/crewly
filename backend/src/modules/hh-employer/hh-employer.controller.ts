import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CompanyRoleGuard } from '../../common/guards/company-role.guard';
import { RequireRole } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { z } from 'zod';
import { HhChatService } from '../../integrations/hh/hh-chat.service';
import { HhCommentsService } from '../../integrations/hh/hh-comments.service';
import { HhSalaryService } from '../../integrations/hh/hh-salary.service';
import { HhVacancyService } from '../../integrations/hh/hh-vacancy.service';
import { HhNegotiationsService } from '../../integrations/hh/hh-negotiations.service';
import { HhClientService } from '../../integrations/hh/hh-client.service';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('api/v1/hh')
@UseGuards(AuthGuard, CompanyRoleGuard)
export class HhEmployerController {
  private readonly logger = new Logger(HhEmployerController.name);

  constructor(
    private readonly hhChat: HhChatService,
    private readonly hhComments: HhCommentsService,
    private readonly hhSalary: HhSalaryService,
    private readonly hhVacancy: HhVacancyService,
    private readonly hhNegotiations: HhNegotiationsService,
    private readonly hhClient: HhClientService,
    private readonly config: ConfigService,
    private readonly db: PrismaService,
  ) {}

  private get employerToken(): string {
    const t = this.config.get<string>('HH_EMPLOYER_TOKEN');
    if (!t) throw new Error('HH_EMPLOYER_TOKEN not configured');
    return t;
  }

  // ── Chats ─────────────────────────────────────────────────────────────────

  @Get('chats')
  listChats(
    @Query('page') page?: string,
    @Query('filter_unread') filterUnread?: string,
    @Query('vacancy_status') vacancyStatus?: string,
    @Query('vacancy_ids') vacancyIds?: string,
  ) {
    return this.hhChat.listChats({
      page: page ? Number(page) : 0,
      filter_unread: filterUnread === 'true',
      ...(vacancyStatus && { vacancy_status: vacancyStatus }),
      ...(vacancyIds && { filter_with_vacancy_ids: vacancyIds }),
    });
  }

  @Get('chats/unread')
  async getUnreadCount() {
    const count = await this.hhChat.getUnreadCount(this.employerToken);
    return { count };
  }

  @Get('chats/:chatId/messages')
  getChatMessages(
    @Param('chatId') chatId: string,
    @Query('limit') limit?: string,
    @Query('order') order?: string,
    @Query('start_message_id') startMessageId?: string,
  ) {
    return this.hhChat.getChatMessages(this.employerToken, chatId, {
      limit: limit ? Number(limit) : 50,
      order: order === 'next' ? 'next' : 'prev',
      ...(startMessageId && { start_message_id: startMessageId }),
    });
  }

  @Post('chats/:chatId/messages')
  @HttpCode(HttpStatus.CREATED)
  @RequireRole('hiring_manager')
  sendChatMessage(
    @Param('chatId') chatId: string,
    @Body(
      new ZodValidationPipe(z.object({ text: z.string().min(1).max(4000) })),
    )
    body: { text: string },
  ) {
    const idempotencyKey = crypto.randomUUID();
    return this.hhChat.sendChatMessage(
      this.employerToken,
      chatId,
      body.text,
      idempotencyKey,
    );
  }

  @Put('chats/:chatId/messages/:messageId/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  markMessageRead(
    @Param('chatId') chatId: string,
    @Param('messageId') messageId: string,
  ) {
    return this.hhChat.markMessageRead(this.employerToken, chatId, messageId);
  }

  @Post('chats/without-vacancy')
  @HttpCode(HttpStatus.OK)
  @RequireRole('hiring_manager')
  createChatWithoutVacancy(
    @Body(
      new ZodValidationPipe(
        z.object({
          resume_hash: z.string().min(1),
          first_message: z.string().min(1).max(4000),
        }),
      ),
    )
    body: {
      resume_hash: string;
      first_message: string;
    },
  ) {
    return this.hhChat.createChatWithoutVacancy(
      body.resume_hash,
      body.first_message,
    );
  }

  @Put('chats/:chatId/write-possibility')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireRole('hiring_manager')
  setWritePossibility(
    @Param('chatId') chatId: string,
    @Body(new ZodValidationPipe(z.object({ allowed: z.boolean() })))
    body: { allowed: boolean },
  ) {
    return this.hhChat.setApplicantWritePossibility(chatId, body.allowed);
  }

  @Get('chats/:chatId/participants')
  getChatParticipants(@Param('chatId') chatId: string) {
    return this.hhChat.getChatParticipants(this.employerToken, chatId);
  }

  @Put('chats/:chatId/leave')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireRole('hiring_manager')
  leaveChat(@Param('chatId') chatId: string) {
    return this.hhChat.leaveChat(chatId);
  }

  @Put('chats/:chatId/messages/:messageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireRole('hiring_manager')
  editChatMessage(
    @Param('chatId') chatId: string,
    @Param('messageId') messageId: string,
    @Body(
      new ZodValidationPipe(z.object({ text: z.string().min(1).max(4000) })),
    )
    body: { text: string },
  ) {
    return this.hhChat.editChatMessage(
      this.employerToken,
      chatId,
      messageId,
      body.text,
    );
  }

  @Delete('chats/:chatId/messages/:messageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireRole('hiring_manager')
  deleteChatMessage(
    @Param('chatId') chatId: string,
    @Param('messageId') messageId: string,
  ) {
    return this.hhChat.deleteChatMessage(this.employerToken, chatId, messageId);
  }

  @Post('chats/files/upload-links')
  @HttpCode(HttpStatus.OK)
  @RequireRole('hiring_manager')
  getFileUploadLinks(
    @Body(
      new ZodValidationPipe(
        z.object({
          files: z
            .array(
              z.object({
                name: z.string().min(1),
                size: z.number().int().positive(),
                content_type: z.string().min(1),
              }),
            )
            .min(1),
        }),
      ),
    )
    body: {
      files: Array<{ name: string; size: number; content_type: string }>;
    },
  ) {
    return this.hhChat.getFileUploadLinks(this.employerToken, body.files);
  }

  // ── Applicant Comments ────────────────────────────────────────────────────

  @Get('applicant-comments/:applicantId')
  listComments(
    @Param('applicantId') applicantId: string,
    @Query('page') page?: string,
    @Query('per_page') perPage?: string,
    @Query('order_by') orderBy?: string,
  ) {
    return this.hhComments.listComments(applicantId, {
      page: page ? Number(page) : 0,
      per_page: perPage ? Number(perPage) : 50,
      ...(orderBy && { order_by: orderBy }),
    });
  }

  @Post('applicant-comments/:applicantId')
  @HttpCode(HttpStatus.CREATED)
  @RequireRole('hiring_manager')
  addComment(
    @Param('applicantId') applicantId: string,
    @Body(
      new ZodValidationPipe(
        z.object({
          text: z.string().min(1).max(5000),
          access_type: z.enum(['manager', 'company']).default('manager'),
        }),
      ),
    )
    body: { text: string; access_type: 'manager' | 'company' },
  ) {
    return this.hhComments.addComment(applicantId, body.text, body.access_type);
  }

  @Put('applicant-comments/:applicantId/:commentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireRole('hiring_manager')
  updateComment(
    @Param('applicantId') applicantId: string,
    @Param('commentId') commentId: string,
    @Body(
      new ZodValidationPipe(
        z.object({
          text: z.string().max(5000).optional(),
          access_type: z.string().optional(),
        }),
      ),
    )
    body: { text?: string; access_type?: string },
  ) {
    return this.hhComments.updateComment(applicantId, commentId, body);
  }

  @Delete('applicant-comments/:applicantId/:commentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireRole('hiring_manager')
  deleteComment(
    @Param('applicantId') applicantId: string,
    @Param('commentId') commentId: string,
  ) {
    return this.hhComments.deleteComment(applicantId, commentId);
  }

  // ── Mail Templates ────────────────────────────────────────────────────────

  @Get('mail-templates')
  getMailTemplates() {
    return this.hhNegotiations.getMailTemplates();
  }

  @Put('mail-templates/:templateId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireRole('hiring_manager')
  updateMailTemplate(
    @Param('templateId') templateId: string,
    @Body(
      new ZodValidationPipe(z.object({ text: z.string().min(1).max(10000) })),
    )
    body: { text: string },
  ) {
    return this.hhNegotiations.updateMailTemplate(templateId, body.text);
  }

  // ── Salary Estimate ───────────────────────────────────────────────────────

  @Get('salary-estimate')
  getSalaryEstimate(
    @Query('position') position: string,
    @Query('area_id') areaId?: string,
    @Query('industry') industry?: string,
    @Query('employee_level') employeeLevel?: string,
    @Query('speciality') speciality?: string,
    @Query('extend_sources') extendSources?: string,
  ) {
    return this.hhSalary.getSalaryEstimate({
      positionName: position,
      ...(areaId && { areaId }),
      ...(industry && { industry }),
      ...(employeeLevel && { employeeLevel }),
      ...(speciality && { speciality }),
      ...(extendSources !== undefined && {
        extendSources: extendSources === 'true',
      }),
    });
  }

  @Get('salary/directories/areas')
  getSalaryAreas() {
    return this.hhSalary.getSalaryAreas();
  }

  @Get('salary/directories/industries')
  getSalaryIndustries() {
    return this.hhSalary.getSalaryIndustries();
  }

  @Get('salary/directories/professional-areas')
  getSalaryProfessionalAreas() {
    return this.hhSalary.getSalaryProfessionalAreas();
  }

  @Get('salary/directories/employee-levels')
  getSalaryEmployeeLevels() {
    return this.hhSalary.getSalaryEmployeeLevels();
  }

  // ── Vacancies ─────────────────────────────────────────────────────────────

  @Get('vacancies/hidden')
  listHiddenVacancies(
    @Query('page') page?: string,
    @Query('per_page') perPage?: string,
    @Query('manager_id') managerId?: string,
  ) {
    return this.hhVacancy.listHiddenVacancies({
      page: page ? Number(page) : 0,
      per_page: perPage ? Number(perPage) : 100,
      ...(managerId && { manager_id: managerId }),
    });
  }

  @Get('vacancies/:vacancyId/prolongation')
  checkProlongation(@Param('vacancyId') vacancyId: string) {
    return this.hhVacancy.checkProlongation(vacancyId);
  }

  @Post('vacancies/:vacancyId/prolongate')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireRole('hiring_manager')
  prolongVacancy(@Param('vacancyId') vacancyId: string) {
    return this.hhVacancy.prolongVacancy(vacancyId);
  }

  // ── Resume Negotiation History ────────────────────────────────────────────

  @Get('resumes/:resumeId/negotiation-history')
  getResumeNegotiationHistory(@Param('resumeId') resumeId: string) {
    return this.hhNegotiations.getResumeNegotiationHistory(resumeId);
  }

  // ── Resume Comments (employer notes on applicant by candidateId) ──────────

  /**
   * Resolve HH applicant ID for a candidate.
   * Reads from hhApplicantId if present; otherwise fetches resume, extracts owner.id,
   * and writes it back so subsequent calls are free.
   */
  private async resolveApplicantId(candidateId: string): Promise<string> {
    const candidate = await this.db.candidate.findUnique({
      where: { id: candidateId },
      select: { hhResumeId: true, hhApplicantId: true },
    });
    if (!candidate?.hhResumeId) {
      throw new NotFoundException('No HH resume linked to this candidate');
    }
    if (candidate.hhApplicantId) return candidate.hhApplicantId;

    const resume = await this.hhClient.getResume(candidate.hhResumeId);
    const applicantId: string | undefined = (resume as any).owner?.id;
    if (!applicantId) {
      throw new NotFoundException(
        'Could not resolve HH applicant ID from resume',
      );
    }
    await this.db.candidate.update({
      where: { id: candidateId },
      data: { hhApplicantId: applicantId },
    });
    return applicantId;
  }

  @Get('candidates/:candidateId/comments')
  async getCandidateComments(
    @Param('candidateId') candidateId: string,
    @Query('page') page?: string,
    @Query('per_page') perPage?: string,
  ) {
    const applicantId = await this.resolveApplicantId(candidateId);
    return this.hhComments.listComments(applicantId, {
      page: page ? Number(page) : 0,
      per_page: perPage ? Number(perPage) : 50,
    });
  }

  @Post('candidates/:candidateId/comments')
  @HttpCode(HttpStatus.CREATED)
  @RequireRole('hiring_manager')
  async addCandidateComment(
    @Param('candidateId') candidateId: string,
    @Body(
      new ZodValidationPipe(
        z.object({
          text: z.string().min(1).max(5000),
          access_type: z.enum(['manager', 'company']).default('manager'),
        }),
      ),
    )
    body: { text: string; access_type: 'manager' | 'company' },
  ) {
    const applicantId = await this.resolveApplicantId(candidateId);
    return this.hhComments.addComment(applicantId, body.text, body.access_type);
  }

  @Delete('candidates/:candidateId/comments/:commentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireRole('hiring_manager')
  async deleteCandidateComment(
    @Param('candidateId') candidateId: string,
    @Param('commentId') commentId: string,
  ) {
    const applicantId = await this.resolveApplicantId(candidateId);
    return this.hhComments.deleteComment(applicantId, commentId);
  }

  // ── Hidden Vacancy Restore ────────────────────────────────────────────────

  @Delete('vacancies/hidden/:hhVacancyId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireRole('hiring_manager')
  restoreHiddenVacancy(@Param('hhVacancyId') hhVacancyId: string) {
    return this.hhVacancy.restoreVacancy(hhVacancyId);
  }
}
