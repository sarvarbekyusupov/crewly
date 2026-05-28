import {
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';
import { HhTokenResponse } from './hh.types';
import { HhProfileSyncService } from './hh-profile-sync.service';

@Injectable()
export class HhOAuthService {
  private readonly logger = new Logger(HhOAuthService.name);
  private readonly hhBaseUrl = 'https://hh.ru';

  constructor(
    private readonly http: HttpService,
    private readonly db: PrismaService,
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
    private readonly profileSync: HhProfileSyncService,
  ) {}

  buildAuthorizeUrl(candidateId: string): string {
    const state = this.jwt.sign(
      { sub: candidateId, purpose: 'hh_connect' },
      {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: '10m',
      },
    );

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.get<string>('HH_CLIENT_ID') ?? '',
      redirect_uri: this.config.get<string>('HH_REDIRECT_URI') ?? '',
      scope: 'resumes negotiations',
      state,
    });

    return `${this.hhBaseUrl}/oauth/authorize?${params}`;
  }

  async exchangeCodeAndStore(code: string, state: string): Promise<void> {
    let candidateId: string;
    try {
      const payload = this.jwt.verify<{
        sub: string;
        purpose: string;
      }>(state, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      });
      if (payload.purpose !== 'hh_connect') throw new Error('wrong purpose');
      candidateId = payload.sub;
    } catch {
      throw new UnauthorizedException('Invalid or expired HH OAuth state');
    }

    const userAgent =
      this.config.get<string>('HH_USER_AGENT') ?? 'my-hr/1.0';

    const response = await firstValueFrom(
      this.http.post<HhTokenResponse>(
        `${this.hhBaseUrl}/oauth/token`,
        new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          client_id: this.config.get<string>('HH_CLIENT_ID') ?? '',
          client_secret: this.config.get<string>('HH_CLIENT_SECRET') ?? '',
          redirect_uri: this.config.get<string>('HH_REDIRECT_URI') ?? '',
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': userAgent,
            'HH-User-Agent': userAgent,
          },
        },
      ),
    );

    const { access_token, refresh_token, expires_in } = response.data;
    const expiresAt = new Date(Date.now() + expires_in * 1000);

    await this.db.candidate.update({
      where: { id: candidateId },
      data: {
        hhOauthToken: access_token,
        hhRefreshToken: refresh_token,
        hhTokenExpiresAt: expiresAt,
      },
    });

    this.logger.log({ candidateId }, 'HH account connected');

    // Fire-and-forget — populate profile fields from HH resume
    this.profileSync.syncFromHh(candidateId, access_token).catch((err) =>
      this.logger.warn(
        { candidateId, err: err.message },
        'HH profile sync failed post-connect',
      ),
    );
  }

  async disconnect(candidateId: string): Promise<void> {
    await this.db.candidate.update({
      where: { id: candidateId },
      data: {
        hhOauthToken: null,
        hhRefreshToken: null,
        hhTokenExpiresAt: null,
        hhResumeId: null,
      },
    });
    this.logger.log({ candidateId }, 'HH account disconnected');
  }
}
