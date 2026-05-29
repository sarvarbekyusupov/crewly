import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CompanyRoleGuard } from '../../common/guards/company-role.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../common/types/auth-user';
import { RequireRole } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ApplicationsService } from './applications.service';
import { SchedulingService } from '../scheduling/scheduling.service';
import {
  UpdateApplicationSchema,
  UpdateApplicationDto,
  RejectApplicationSchema,
  RejectApplicationDto,
  HireApplicationSchema,
  HireApplicationDto,
  BulkRejectSchema,
  BulkRejectDto,
  BulkApproveSchema,
  BulkApproveDto,
  SubmitDebriefSchema,
  SubmitDebriefDto,
  UploadTranscriptSchema,
  UploadTranscriptDto,
} from './dto/application.dto';
import {
  ScheduleInterviewSchema,
  ScheduleInterviewDto,
} from '../scheduling/dto/scheduling.dto';

@Controller('api/v1/applications')
@UseGuards(AuthGuard, CompanyRoleGuard)
export class ApplicationsController {
  constructor(
    private readonly svc: ApplicationsService,
    private readonly schedulingSvc: SchedulingService,
  ) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthUser,
    @Query('jobId') jobId?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.findAll(user.companyId, {
      jobId,
      status,
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
    });
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.findOne(user.companyId, id);
  }

  @Patch(':id')
  @RequireRole('hiring_manager')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(UpdateApplicationSchema))
    dto: UpdateApplicationDto,
  ) {
    return this.svc.update(user.companyId, id, dto);
  }

  @Post(':id/approve')
  @RequireRole('hiring_manager')
  approve(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.approve(user.companyId, id, user.id);
  }

  @Post(':id/reject')
  @RequireRole('hiring_manager')
  reject(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(RejectApplicationSchema))
    dto: RejectApplicationDto,
  ) {
    return this.svc.reject(user.companyId, id, dto.reason, user.id);
  }

  @Post(':id/mark-interviewed')
  @RequireRole('hiring_manager')
  markInterviewed(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.markInterviewed(user.companyId, id, user.id);
  }

  @Post(':id/make-offer')
  @RequireRole('hiring_manager')
  makeOffer(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.makeOffer(user.companyId, id, user.id);
  }

  @Post(':id/hire')
  @RequireRole('hiring_manager')
  hire(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(HireApplicationSchema)) dto: HireApplicationDto,
  ) {
    return this.svc.hire(user.companyId, id, dto, user.id);
  }

  @Post(':id/schedule-interview')
  @RequireRole('hiring_manager')
  scheduleInterview(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(ScheduleInterviewSchema))
    dto: ScheduleInterviewDto,
  ) {
    return this.schedulingSvc.scheduleInterview(user.companyId, id, dto, user.id);
  }

  @Post(':id/debrief')
  @RequireRole('hiring_manager')
  submitDebrief(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(SubmitDebriefSchema)) body: SubmitDebriefDto,
  ) {
    return this.svc.submitInterviewDebrief(
      user.companyId,
      id,
      body.feedback,
      user.id,
    );
  }

  @Post(':id/transcript')
  @RequireRole('hiring_manager')
  uploadTranscript(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(UploadTranscriptSchema)) body: UploadTranscriptDto,
  ) {
    return this.svc.uploadAndAnalyzeTranscript(
      user.companyId,
      id,
      body.transcript,
      user.id,
    );
  }

  @Get(':id/dossier')
  getDossier(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.getDossier(user.companyId, id);
  }

  @Post(':id/retry-outreach')
  @RequireRole('hiring_manager')
  retryOutreach(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.retryOutreach(user.companyId, id);
  }

  @Post('bulk-reject')
  @RequireRole('hiring_manager')
  bulkReject(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(BulkRejectSchema)) body: BulkRejectDto,
  ) {
    return this.svc.bulkReject(user.companyId, body.ids, body.reason, user.id);
  }

  @Post('bulk-approve')
  @RequireRole('hiring_manager')
  bulkApprove(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(BulkApproveSchema)) body: BulkApproveDto,
  ) {
    return this.svc.bulkApprove(user.companyId, body.ids, user.id);
  }
}
