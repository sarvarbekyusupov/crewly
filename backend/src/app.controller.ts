import { Controller, Get, Logger, Query, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { AppService } from './app.service';
import { Public } from './common/decorators/public.decorator';
import { HhClientService } from './integrations/hh/hh-client.service';
import { HhOAuthService } from './integrations/hh/hh-oauth.service';
import { HhResumeService } from './integrations/hh/hh-resume.service';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(
    private readonly appService: AppService,
    private readonly config: ConfigService,
    private readonly hhClient: HhClientService,
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

    console.log('[HH callback hit]', { code: !!code, state: !!state, error });

    if (error || !code || !state) {
      console.log('[HH callback] denied — missing code/state or error param');
      return res.redirect(`${base}?hh=denied`);
    }

    try {
      const candidateId = this.hhOAuth.verifyCandidateState(state);
      console.log('[HH callback] state verified, candidateId:', candidateId);
      const tokenResp = await this.hhOAuth.exchangeCode(code, candidateId);
      console.log(
        '[HH callback] token exchange SUCCESS, checking account type...',
      );

      const meData = await this.hhClient.getMe(tokenResp.access_token);
      console.log('[HH /me]', JSON.stringify(meData));

      if (meData.auth_type === 'employer') {
        await this.hhOAuth.clearTokens(candidateId);
        return res.redirect(`${base}?hh=employer_account`);
      }

      let resumes: Awaited<ReturnType<typeof this.hhOAuth.getResumesForToken>>;
      try {
        resumes = await this.hhOAuth.getResumesForToken(tokenResp.access_token);
      } catch (resumeErr: any) {
        const isForbidden =
          resumeErr?.response?.status === 403 ||
          resumeErr?.response?.data?.errors?.[0]?.type === 'forbidden';
        if (isForbidden) {
          // Token is already stored — keep it so the user can manually enter their resume URL.
          // Redirect to a partial-connection state rather than failing entirely.
          return res.redirect(`${base}?hh=connected_no_resume`);
        }
        throw resumeErr;
      }

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
      console.error('[HH OAuth callback failed]', {
        message: err.message,
        status: err?.response?.status,
        data: err?.response?.data,
      });
      this.logger.error(
        {
          message: err.message,
          status: err?.response?.status,
          data: err?.response?.data,
        },
        'HH OAuth callback failed',
      );
      const detail = err?.response?.data
        ? JSON.stringify(err.response.data)
        : (err.message ?? 'unknown');
      const reason = encodeURIComponent(detail);
      return res.redirect(`${base}?hh=error&reason=${reason}`);
    }
  }
}
