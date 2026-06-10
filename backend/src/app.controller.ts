import { Controller, Get, Logger, Query, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { AppService } from './app.service';
import { Public } from './common/decorators/public.decorator';
import { HhOAuthService } from './integrations/hh/hh-oauth.service';
import { HhResumeService } from './integrations/hh/hh-resume.service';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(
    private readonly appService: AppService,
    private readonly config: ConfigService,
    private readonly hhOAuth: HhOAuthService,
    private readonly hhResume: HhResumeService,
    private readonly db: PrismaService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('auth/hh/callback')
  @Public()
  async handleHhCallbackRedirect(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    const frontendBase = this.config.get<string>('FRONTEND_URL') ?? '';
    const base = `${frontendBase}/candidate/preferences`;

    if (error || !code || !state) {
      return res.redirect(`${base}?hh=denied`);
    }

    try {
      const candidateId = this.hhOAuth.verifyCandidateState(state);
      const tokenResp = await this.hhOAuth.exchangeCode(code, candidateId);
      const resumes = await this.hhOAuth.getResumesForToken(
        tokenResp.access_token,
      );

      if (!resumes.length) {
        return res.redirect(`${base}?hh=no_resume`);
      }

      await this.hhOAuth.saveResumeId(candidateId, resumes[0].id);
      // Auto-import HH resume data into Crewly profile (best-effort, don't fail callback)
      try {
        const resumeDetail = await this.hhResume.getResume(
          tokenResp.access_token,
          resumes[0].id,
        );
        const updates: Record<string, unknown> = {};
        if (resumeDetail.skill_set?.length)
          updates['skills'] = resumeDetail.skill_set;
        if (resumeDetail.title) updates['currentPosition'] = resumeDetail.title;
        if (Object.keys(updates).length) {
          await this.db.candidate.update({
            where: { id: candidateId },
            data: updates,
          });
        }
      } catch (importErr: any) {
        this.logger.warn(
          { candidateId, err: importErr.message },
          'HH profile import failed (non-fatal)',
        );
      }
      return res.redirect(`${base}?hh=connected`);
    } catch (err: any) {
      this.logger.error({ err: err.message }, 'HH OAuth callback failed');
      return res.redirect(`${base}?hh=error`);
    }
  }
}
