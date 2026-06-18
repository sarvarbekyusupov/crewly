import { Controller, Get, Logger, Query, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { AppService } from './app.service';
import { Public } from './common/decorators/public.decorator';
import { HhClientService } from './integrations/hh/hh-client.service';
import { HhOAuthService } from './integrations/hh/hh-oauth.service';
import { LinkedInOAuthService } from './integrations/linkedin/linkedin-oauth.service';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(
    private readonly appService: AppService,
    private readonly config: ConfigService,
    private readonly hhClient: HhClientService,
    private readonly hhOAuth: HhOAuthService,
    private readonly linkedInOAuth: LinkedInOAuthService,
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
      this.logger.warn(
        { error },
        'HH OAuth callback denied — missing code/state',
      );
      return res.redirect(`${base}?hh=denied`);
    }

    try {
      const candidateId = this.hhOAuth.verifyCandidateState(state);
      const tokenResp = await this.hhOAuth.exchangeCode(code, candidateId);

      const meData = await this.hhClient.getMe(tokenResp.access_token);
      this.logger.debug({ auth_type: meData.auth_type }, 'HH /me response');

      if (meData.auth_type === 'employer') {
        await this.hhOAuth.clearTokens(candidateId);
        return res.redirect(`${base}?hh=employer_account`);
      }

      // HH applicant API closed — token stored for identity (GET /me) only.
      return res.redirect(`${base}?hh=connected`);
    } catch (err: any) {
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

  @Get('auth/linkedin/callback')
  @Public()
  async handleLinkedInCallbackRedirect(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    const frontendBase = this.config.get<string>('FRONTEND_URL') ?? '';
    const base = `${frontendBase}/candidate/preferences`;

    if (error || !code || !state) {
      this.logger.warn(
        { error },
        'LinkedIn OAuth callback denied — missing code/state',
      );
      return res.redirect(`${base}?linkedin=denied`);
    }

    try {
      const candidateId = this.linkedInOAuth.verifyCandidateState(state);
      const tokenResp = await this.linkedInOAuth.exchangeCode(
        code,
        candidateId,
      );

      let userInfo: Awaited<ReturnType<typeof this.linkedInOAuth.getUserInfo>>;
      try {
        userInfo = await this.linkedInOAuth.getUserInfo(tokenResp.access_token);
      } catch (infoErr: any) {
        this.logger.warn(
          { candidateId, err: infoErr.message },
          'LinkedIn userinfo fetch failed (non-fatal)',
        );
        return res.redirect(`${base}?linkedin=connected`);
      }

      // Best-effort profile import from LinkedIn userinfo
      try {
        const updates: Record<string, unknown> = {};
        if (userInfo.name && !userInfo.given_name)
          updates['fullName'] = userInfo.name;
        if (userInfo.given_name || userInfo.family_name) {
          updates['fullName'] = [userInfo.given_name, userInfo.family_name]
            .filter(Boolean)
            .join(' ');
        }
        if (Object.keys(updates).length) {
          await this.db.candidate.update({
            where: { id: candidateId },
            data: updates,
          });
        }
      } catch (importErr: any) {
        this.logger.warn(
          { candidateId, err: importErr.message },
          'LinkedIn profile import failed (non-fatal)',
        );
      }

      return res.redirect(`${base}?linkedin=connected`);
    } catch (err: any) {
      this.logger.error(
        {
          message: err.message,
          status: err?.response?.status,
          data: err?.response?.data,
        },
        'LinkedIn OAuth callback failed',
      );
      const detail = err?.response?.data
        ? JSON.stringify(err.response.data)
        : (err.message ?? 'unknown');
      const reason = encodeURIComponent(detail);
      return res.redirect(`${base}?linkedin=error&reason=${reason}`);
    }
  }
}
