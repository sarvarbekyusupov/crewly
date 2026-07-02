import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { TmaService } from './tma.service';
import { TmaAuthGuard, TmaRole } from './guards/tma-auth.guard';

const C_ACCESS_COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 15 * 60 * 1000,
};

const C_REFRESH_COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 30 * 24 * 60 * 60 * 1000,
  path: '/api/v1/candidate-auth/refresh',
};

@Controller('api/v1/tma')
export class TmaController {
  constructor(private readonly tma: TmaService) {}

  @Post('auth')
  @HttpCode(HttpStatus.OK)
  async auth(@Body() body: { initData: string }) {
    return this.tma.auth(body.initData);
  }

  @Post('session-login')
  @HttpCode(HttpStatus.OK)
  async sessionLogin(
    @Body() body: { initData: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken, candidate } =
      await this.tma.sessionLogin(
        body.initData,
        req.ip,
        req.headers['user-agent'],
      );
    res.cookie('c_access_token', accessToken, C_ACCESS_COOKIE_OPTS);
    res.cookie('c_refresh_token', refreshToken, C_REFRESH_COOKIE_OPTS);
    return { candidate };
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
