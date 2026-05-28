import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CompanyRoleGuard } from '../../common/guards/company-role.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequireRole } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JobsService } from './jobs.service';
import {
  CreateJobDto,
  CreateJobSchema,
  UpdateJobDto,
  UpdateJobSchema,
} from './dto/job.dto';

@Controller('api/v1/jobs')
@UseGuards(AuthGuard, CompanyRoleGuard)
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  findAll(
    @CurrentUser() user: any,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.jobsService.findAll(user.companyId, {
      status,
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
    });
  }

  @Post()
  @RequireRole('hiring_manager')
  create(
    @CurrentUser() user: any,
    @Body(new ZodValidationPipe(CreateJobSchema)) dto: CreateJobDto,
  ) {
    return this.jobsService.create(user.companyId, user.id, dto);
  }

  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.jobsService.findOne(user.companyId, id);
  }

  @Patch(':id')
  @RequireRole('hiring_manager')
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateJobSchema)) dto: UpdateJobDto,
  ) {
    return this.jobsService.update(user.companyId, id, dto);
  }

  @Post(':id/activate')
  @RequireRole('hiring_manager')
  activate(@CurrentUser() user: any, @Param('id') id: string) {
    return this.jobsService.activate(user.companyId, id);
  }

  @Post(':id/pause')
  @RequireRole('hiring_manager')
  pause(@CurrentUser() user: any, @Param('id') id: string) {
    return this.jobsService.pause(user.companyId, id);
  }

  @Post(':id/close')
  @RequireRole('admin')
  close(@CurrentUser() user: any, @Param('id') id: string) {
    return this.jobsService.close(user.companyId, id);
  }

  @Post(':id/send-outreach')
  @RequireRole('hiring_manager')
  sendOutreach(@CurrentUser() user: any, @Param('id') id: string) {
    return this.jobsService.sendOutreach(user.companyId, id);
  }

  @Delete(':id')
  @RequireRole('admin')
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.jobsService.softDelete(user.companyId, id);
  }

  @Get(':id/applications')
  getApplications(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.jobsService.getApplications(
      user.companyId,
      id,
      page ? +page : undefined,
      limit ? +limit : undefined,
    );
  }

  @Get(':id/stats')
  getStats(@CurrentUser() user: any, @Param('id') id: string) {
    return this.jobsService.getStats(user.companyId, id);
  }

  @Get(':id/hh-viewers')
  @RequireRole('hiring_manager')
  getHhViewers(@CurrentUser() user: any, @Param('id') id: string) {
    return this.jobsService.getHhViewers(user.companyId, id);
  }

  @Post(':id/publish-hh')
  @RequireRole('hiring_manager')
  publishToHh(@CurrentUser() user: any, @Param('id') id: string) {
    return this.jobsService.publishToHh(user.companyId, id);
  }

  @Post(':id/archive-hh')
  @RequireRole('hiring_manager')
  archiveOnHh(@CurrentUser() user: any, @Param('id') id: string) {
    return this.jobsService.archiveOnHh(user.companyId, id);
  }

  @Post(':id/prolong-hh')
  @RequireRole('hiring_manager')
  prolongOnHh(@CurrentUser() user: any, @Param('id') id: string) {
    return this.jobsService.prolongOnHh(user.companyId, id);
  }
}
