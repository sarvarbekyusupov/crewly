import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TmaService } from './tma.service';
import { TmaAuthGuard, TmaRole } from './guards/tma-auth.guard';

@Controller('api/v1/tma')
export class TmaController {
  constructor(private readonly tma: TmaService) {}

  @Post('auth')
  @HttpCode(HttpStatus.OK)
  async auth(@Body() body: { initData: string }) {
    return this.tma.auth(body.initData);
  }

  // ── Candidate routes ────────────────────────────────────────────
  @Get('candidate/feed')
  @UseGuards(TmaAuthGuard)
  @TmaRole('candidate')
  getCandidateFeed(@Req() req: any) {
    return this.tma.getCandidateFeed(req.tmaUser.id);
  }

  @Get('candidate/applications')
  @UseGuards(TmaAuthGuard)
  @TmaRole('candidate')
  getCandidateApplications(@Req() req: any) {
    return this.tma.getCandidateApplications(req.tmaUser.id);
  }

  @Get('candidate/jobs/:id')
  @UseGuards(TmaAuthGuard)
  @TmaRole('candidate')
  getCandidateJobDetail(@Req() req: any, @Param('id') jobId: string) {
    return this.tma.getCandidateJobDetail(req.tmaUser.id, jobId);
  }

  @Post('candidate/jobs/:id/apply')
  @UseGuards(TmaAuthGuard)
  @TmaRole('candidate')
  @HttpCode(HttpStatus.OK)
  applyToJob(@Req() req: any, @Param('id') jobId: string) {
    return this.tma.applyToDiscoveredJob(req.tmaUser.id, jobId);
  }

  // ── HR routes ────────────────────────────────────────────────────
  @Get('hr/pipeline')
  @UseGuards(TmaAuthGuard)
  @TmaRole('hr')
  getHrPipeline(@Req() req: any) {
    return this.tma.getHrPipeline(req.tmaUser.id);
  }

  @Post('hr/applications/:id/approve')
  @UseGuards(TmaAuthGuard)
  @TmaRole('hr')
  @HttpCode(HttpStatus.OK)
  approveApplication(@Req() req: any, @Param('id') appId: string) {
    return this.tma.approveApplication(appId, req.tmaUser.id);
  }

  @Post('hr/applications/:id/reject')
  @UseGuards(TmaAuthGuard)
  @TmaRole('hr')
  @HttpCode(HttpStatus.OK)
  rejectApplication(
    @Req() req: any,
    @Param('id') appId: string,
    @Body() body: { reason?: string },
  ) {
    return this.tma.rejectApplication(appId, req.tmaUser.id, body.reason);
  }

  @Get('hr/applications/:id/candidate')
  @UseGuards(TmaAuthGuard)
  @TmaRole('hr')
  getCandidateProfile(@Req() req: any, @Param('id') appId: string) {
    return this.tma.getCandidateProfileForHr(appId, req.tmaUser.id);
  }
}
