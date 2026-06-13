import {
  Injectable,
  Logger,
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'crypto';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';
import { HH_BASE_URL, HH_AUTH_URL } from './hh.constants';

interface HhTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
}

interface HhResumeMine {
  id: string;
  title: string;
  alternate_url: string;
}

const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000; // refresh 5 min before expiry

@Injectable()
export class HhOAuthService {
  private readonly logger = new Logger(HhOAuthService.name);
  private readonly baseUrl = HH_BASE_URL;
  private readonly inflightRefreshes = new Map<string, Promise<string>>();

  constructor(
    private readonly config: ConfigService,
    private readonly http: HttpService,
    private readonly jwt: JwtService,
    private readonly db: PrismaService,
  ) {}

  private get ua(): string {
    return this.config.get<string>('HH_USER_AGENT') ?? 'crewly/1.0';
  }

  getAuthorizationUrl(candidateId: string): string {
    const clientId = this.config.get<string>('HH_CLIENT_ID') ?? '';
    const redirectUri = this.config.get<string>('HH_REDIRECT_URI') ?? '';

    const state = this.jwt.sign(
      { candidateId, nonce: randomBytes(16).toString('hex') },
      {
        secret: this.config.get<string>('JWT_CANDIDATE_SECRET'),
        expiresIn: '10m',
      },
    );

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      state,
    });

    return `${HH_AUTH_URL}?${params.toString()}`;
  }

  verifyCandidateState(state: string): string {
    try {
      const payload = this.jwt.verify<{ candidateId: string }>(state, {
        secret: this.config.get<string>('JWT_CANDIDATE_SECRET'),
      });
      if (!payload?.candidateId)
        throw new BadRequestException('Invalid state payload');
      return payload.candidateId;
    } catch {
      throw new BadRequestException('Invalid or expired OAuth state');
    }
  }

  async exchangeCode(
    code: string,
    candidateId: string,
  ): Promise<HhTokenResponse> {
    const clientId = this.config.get<string>('HH_CLIENT_ID') ?? '';
    const clientSecret = this.config.get<string>('HH_CLIENT_SECRET') ?? '';
    const redirectUri = this.config.get<string>('HH_REDIRECT_URI') ?? '';

    const response = await firstValueFrom(
      this.http.post<HhTokenResponse>(
        `${this.baseUrl}/token`,
        new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': this.ua,
            'HH-User-Agent': this.ua,
          },
        },
      ),
    );

    const tokenResp = response.data;
    await this.db.candidate.update({
      where: { id: candidateId },
      data: {
        hhOauthToken: tokenResp.access_token,
        hhRefreshToken: tokenResp.refresh_token,
        hhTokenExpiresAt: new Date(Date.now() + tokenResp.expires_in * 1000),
      },
    });

    this.logger.log({ candidateId }, 'HH OAuth tokens stored');
    return tokenResp;
  }

  /** Returns a valid access token for the candidate, refreshing if needed. */
  async getCandidateToken(candidateId: string): Promise<string> {
    const candidate = await this.db.candidate.findUnique({
      where: { id: candidateId },
      select: {
        hhOauthToken: true,
        hhRefreshToken: true,
        hhTokenExpiresAt: true,
      },
    });

    if (!candidate?.hhOauthToken) {
      throw new UnprocessableEntityException({
        code: 'hh_not_connected',
        message: 'HH account not connected',
      });
    }

    const expiresAt = candidate.hhTokenExpiresAt;
    const needsRefresh =
      !expiresAt || expiresAt.getTime() - Date.now() < TOKEN_REFRESH_BUFFER_MS;

    if (!needsRefresh) return candidate.hhOauthToken;

    if (!candidate.hhRefreshToken) {
      throw new UnprocessableEntityException({
        code: 'hh_not_connected',
        message: 'HH token expired — please reconnect',
      });
    }

    // Deduplicate concurrent refresh calls for the same candidate
    let promise = this.inflightRefreshes.get(candidateId);
    if (!promise) {
      promise = this.refreshToken(
        candidateId,
        candidate.hhRefreshToken,
      ).finally(() => this.inflightRefreshes.delete(candidateId));
      this.inflightRefreshes.set(candidateId, promise);
    }
    return promise;
  }

  private async refreshToken(
    candidateId: string,
    refreshToken: string,
  ): Promise<string> {
    const clientId = this.config.get<string>('HH_CLIENT_ID') ?? '';
    const clientSecret = this.config.get<string>('HH_CLIENT_SECRET') ?? '';

    try {
      const response = await firstValueFrom(
        this.http.post<HhTokenResponse>(
          `${this.baseUrl}/token`,
          new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            client_id: clientId,
            client_secret: clientSecret,
          }).toString(),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'User-Agent': this.ua,
              'HH-User-Agent': this.ua,
            },
          },
        ),
      );

      const tokenResp = response.data;
      await this.db.candidate.update({
        where: { id: candidateId },
        data: {
          hhOauthToken: tokenResp.access_token,
          hhRefreshToken: tokenResp.refresh_token,
          hhTokenExpiresAt: new Date(Date.now() + tokenResp.expires_in * 1000),
        },
      });

      this.logger.log({ candidateId }, 'HH OAuth token refreshed');
      return tokenResp.access_token;
    } catch (err: any) {
      const isInvalidGrant = err?.response?.data?.error === 'invalid_grant';
      if (isInvalidGrant) {
        await this.clearTokens(candidateId).catch((clearErr: any) => {
          this.logger.warn(
            { candidateId, err: clearErr.message },
            'Failed to clear revoked HH tokens — stale tokens may remain',
          );
        });
        this.logger.warn(
          { candidateId },
          'HH refresh token revoked — tokens cleared',
        );
      } else {
        this.logger.warn(
          { candidateId, err: err.message },
          'HH token refresh failed',
        );
      }
      throw new UnprocessableEntityException({
        code: 'hh_not_connected',
        message: 'HH token refresh failed — please reconnect',
      });
    }
  }

  async getResumesForToken(accessToken: string): Promise<HhResumeMine[]> {
    try {
      const response = await firstValueFrom(
        this.http.get<{ items: HhResumeMine[] }>(
          `${this.baseUrl}/resumes/mine`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'User-Agent': this.ua,
              'HH-User-Agent': this.ua,
            },
          },
        ),
      );
      return response.data.items ?? [];
    } catch (err: any) {
      this.logger.warn(
        { err: err.message },
        'Failed to fetch candidate resumes from HH',
      );
      return [];
    }
  }

  async saveResumeId(candidateId: string, hhResumeId: string): Promise<void> {
    await this.db.candidate.update({
      where: { id: candidateId },
      data: { hhResumeId },
    });
    this.logger.log(
      { candidateId, hhResumeId },
      'HH resume ID saved for candidate',
    );
  }

  /** Clears only OAuth token fields — preserves hhResumeId. Use on token revocation. */
  async clearTokens(candidateId: string): Promise<void> {
    await this.db.candidate.update({
      where: { id: candidateId },
      data: {
        hhOauthToken: null,
        hhRefreshToken: null,
        hhTokenExpiresAt: null,
      },
    });
    this.logger.log({ candidateId }, 'HH OAuth tokens cleared');
  }

  /** Clears OAuth tokens AND resume ID. Use when candidate explicitly disconnects. */
  async clearResumeId(candidateId: string): Promise<void> {
    await this.db.candidate.update({
      where: { id: candidateId },
      data: {
        hhResumeId: null,
        hhOauthToken: null,
        hhRefreshToken: null,
        hhTokenExpiresAt: null,
      },
    });
    this.logger.log({ candidateId }, 'HH OAuth tokens and resume ID cleared');
  }
}
