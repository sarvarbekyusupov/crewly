import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { HhOAuthService } from '../../integrations/hh/hh-oauth.service';
import { HhTokenService } from '../../integrations/hh/hh-token.service';
import { HhClientService } from '../../integrations/hh/hh-client.service';
import { HhProfileSyncService } from '../../integrations/hh/hh-profile-sync.service';
import { CandidateAuthGuard } from '../candidate-auth/guards/candidate-auth.guard';
import { CurrentCandidate } from '../../common/decorators/current-candidate.decorator';
import { Public } from '../../common/decorators/public.decorator';

@Controller('api/v1/candidate-portal/hh')
@Public()
export class HhOAuthController {
  constructor(
    private readonly hhOAuth: HhOAuthService,
    private readonly hhToken: HhTokenService,
    private readonly hhClient: HhClientService,
    private readonly profileSync: HhProfileSyncService,
    private readonly db: PrismaService,
    private readonly config: ConfigService,
  ) {}

  @Get('connect')
  @UseGuards(CandidateAuthGuard)
  connect(@CurrentCandidate() candidate: { id: string }, @Res() res: Response) {
    const url = this.hhOAuth.buildAuthorizeUrl(candidate.id);
    res.redirect(url);
  }

  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    const base = this.config.get<string>('FRONTEND_URL');
    const successUrl = `${base}/candidate/preferences?hh_connected=1`;
    const failUrl = `${base}/candidate/preferences?hh_error=`;

    if (error || !code || !state) {
      return res.redirect(`${failUrl}access_denied`);
    }

    try {
      await this.hhOAuth.exchangeCodeAndStore(code, state);
      return res.redirect(successUrl);
    } catch (err: any) {
      const reason =
        err?.response?.status === 400 ? 'invalid_code' : 'exchange_failed';
      res.redirect(`${failUrl}${reason}`);
    }
  }

  @Delete('disconnect')
  @UseGuards(CandidateAuthGuard)
  @HttpCode(HttpStatus.OK)
  async disconnect(@CurrentCandidate() candidate: { id: string }) {
    await this.hhOAuth.disconnect(candidate.id);
    return { ok: true };
  }

  /** Returns the seeker's active (non-rejected) HH applications. */
  @Get('negotiations')
  @UseGuards(CandidateAuthGuard)
  async getActiveNegotiations(@CurrentCandidate() candidate: { id: string }) {
    const token = await this.hhToken.getValidToken(candidate.id);
    return this.hhClient.getActiveNegotiations(token);
  }

  /** Hides/archives a seeker's HH application. */
  @Delete('negotiations/:id')
  @UseGuards(CandidateAuthGuard)
  @HttpCode(HttpStatus.OK)
  async hideNegotiation(
    @CurrentCandidate() candidate: { id: string },
    @Param('id') negotiationId: string,
  ) {
    const token = await this.hhToken.getValidToken(candidate.id);
    await this.hhClient.hideNegotiation(negotiationId, token);
    return { ok: true };
  }

  /** Create or update the seeker's resume on HH from their profile data. */
  @Post('resume/sync')
  @UseGuards(CandidateAuthGuard)
  async syncResume(@CurrentCandidate() candidate: { id: string }) {
    const token = await this.hhToken.getValidToken(candidate.id);
    const resumeId = await this.profileSync.pushResumeToHh(candidate.id, token);
    return { resumeId };
  }

  /** Publish (make visible to employers) the seeker's HH resume. */
  @Post('resume/publish')
  @UseGuards(CandidateAuthGuard)
  async publishResume(@CurrentCandidate() candidate: { id: string }) {
    const token = await this.hhToken.getValidToken(candidate.id);
    const c = await this.db.candidate.findUniqueOrThrow({
      where: { id: candidate.id },
      select: { hhResumeId: true },
    });
    if (!c.hhResumeId)
      throw new BadRequestException(
        'No HH resume — call POST /hh/resume/sync first',
      );
    await this.profileSync.publishResume(c.hhResumeId, token);
    return { ok: true };
  }
}
