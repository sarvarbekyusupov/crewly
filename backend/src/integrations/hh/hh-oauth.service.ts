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
import {
  HH_BASE_URL,
  HH_AUTH_URL,
  HH_HOST,
  HH_TOKEN_URL,
} from './hh.constants';

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

// HH only allows refresh AFTER token expires: "token not expired" = 400 invalid_grant.
// No buffer — refresh only when Date.now() >= expiresAt.

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
    const clientId = this.config.get<string>('HH_CLIENT_ID');
    const redirectUri = this.config.get<string>('HH_REDIRECT_URI');
    const jwtSecret = this.config.get<string>('JWT_CANDIDATE_SECRET');
    if (!clientId || !redirectUri) {
      throw new Error('HH_CLIENT_ID and HH_REDIRECT_URI must be configured');
    }
    if (!jwtSecret) {
      throw new Error('JWT_CANDIDATE_SECRET must be configured');
    }

    const state = this.jwt.sign(
      { candidateId, nonce: randomBytes(16).toString('hex') },
      {
        secret: jwtSecret,
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
    const jwtSecret = this.config.get<string>('JWT_CANDIDATE_SECRET');
    if (!jwtSecret) throw new Error('JWT_CANDIDATE_SECRET must be configured');
    try {
      const payload = this.jwt.verify<{ candidateId: string }>(state, {
        secret: jwtSecret,
      });
      if (!payload?.candidateId)
        throw new BadRequestException('Invalid state payload');
      return payload.candidateId;
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException('Invalid or expired OAuth state');
    }
  }

  async exchangeCode(
    code: string,
    candidateId: string,
  ): Promise<HhTokenResponse> {
    const clientId = this.config.get<string>('HH_CLIENT_ID');
    const clientSecret = this.config.get<string>('HH_CLIENT_SECRET');
    const redirectUri = this.config.get<string>('HH_REDIRECT_URI');
    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error(
        'HH_CLIENT_ID, HH_CLIENT_SECRET and HH_REDIRECT_URI must be configured',
      );
    }

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }).toString();
    this.logger.debug({ body, url: HH_TOKEN_URL }, 'HH token exchange request');

    let response: Awaited<
      ReturnType<
        typeof firstValueFrom<import('axios').AxiosResponse<HhTokenResponse>>
      >
    >;
    try {
      response = await firstValueFrom(
        this.http.post<HhTokenResponse>(HH_TOKEN_URL, body, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': this.ua,
            'HH-User-Agent': this.ua,
          },
        }),
      );
    } catch (err: any) {
      console.error('[HH token exchange failed]', {
        status: err?.response?.status,
        data: err?.response?.data,
        body,
      });
      this.logger.error(
        { status: err?.response?.status, data: err?.response?.data, body },
        'HH token exchange failed',
      );
      throw err;
    }

    const tokenResp = response.data;
    const expiresInMs =
      tokenResp.expires_in && tokenResp.expires_in > 0
        ? tokenResp.expires_in * 1000
        : 60 * 60 * 1000; // default 1h if HH omits or sends 0
    await this.db.candidate.update({
      where: { id: candidateId },
      data: {
        hhOauthToken: tokenResp.access_token,
        hhRefreshToken: tokenResp.refresh_token,
        hhTokenExpiresAt: new Date(Date.now() + expiresInMs),
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
    const needsRefresh = !expiresAt || Date.now() >= expiresAt.getTime();

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
    const clientId = this.config.get<string>('HH_CLIENT_ID');
    const clientSecret = this.config.get<string>('HH_CLIENT_SECRET');
    if (!clientId || !clientSecret) {
      throw new UnprocessableEntityException({
        code: 'hh_not_connected',
        message: 'HH OAuth credentials not configured — please reconnect',
      });
    }

    try {
      const response = await firstValueFrom(
        this.http.post<HhTokenResponse>(
          HH_TOKEN_URL,
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
      const expiresInMs =
        tokenResp.expires_in && tokenResp.expires_in > 0
          ? tokenResp.expires_in * 1000
          : 60 * 60 * 1000; // default 1h if HH omits or sends 0
      await this.db.candidate.update({
        where: { id: candidateId },
        data: {
          hhOauthToken: tokenResp.access_token,
          hhRefreshToken: tokenResp.refresh_token,
          hhTokenExpiresAt: new Date(Date.now() + expiresInMs),
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
    const url = `${this.baseUrl}/resumes/mine`;
    console.log(
      '[HH getResumesForToken] calling',
      url,
      'token:',
      accessToken.slice(0, 15) + '...',
    );
    try {
      const response = await firstValueFrom(
        this.http.get<{ items: HhResumeMine[] }>(url, {
          params: { host: HH_HOST },
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'User-Agent': this.ua,
            'HH-User-Agent': this.ua,
          },
        }),
      );
      console.log(
        '[HH getResumesForToken] SUCCESS, items:',
        response.data.items?.length ?? 0,
      );
      return response.data.items ?? [];
    } catch (err: any) {
      console.error('[HH getResumesForToken] FAILED', {
        status: err?.response?.status,
        headers: err?.response?.headers,
        data: JSON.stringify(err?.response?.data),
        token: accessToken.slice(0, 15) + '...',
      });
      throw err;
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
  async disconnectHh(candidateId: string): Promise<void> {
    const candidate = await this.db.candidate.findUnique({
      where: { id: candidateId },
      select: { hhOauthToken: true },
    });

    if (candidate?.hhOauthToken) {
      await this.revokeToken(candidate.hhOauthToken);
    }

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

  private async revokeToken(accessToken: string): Promise<void> {
    try {
      await firstValueFrom(
        this.http.delete(`${this.baseUrl}/oauth/token`, {
          params: { access_token: accessToken },
          headers: {
            'User-Agent': this.ua,
            'HH-User-Agent': this.ua,
          },
        }),
      );
      this.logger.log('HH access token revoked');
    } catch (err: any) {
      // Best-effort: revocation failure must not block disconnect
      this.logger.warn(
        { status: err?.response?.status },
        'HH token revocation failed — token may remain valid until expiry',
      );
    }
  }
}
