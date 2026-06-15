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
  LINKEDIN_AUTH_URL,
  LINKEDIN_TOKEN_URL,
  LINKEDIN_USERINFO_URL,
  LINKEDIN_SCOPES,
} from './linkedin.constants';

interface LinkedInTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
  token_type: string;
  scope: string;
}

export interface LinkedInUserInfo {
  sub: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  email?: string;
  picture?: string;
}

@Injectable()
export class LinkedInOAuthService {
  private readonly logger = new Logger(LinkedInOAuthService.name);
  private readonly inflightRefreshes = new Map<string, Promise<string>>();

  constructor(
    private readonly config: ConfigService,
    private readonly http: HttpService,
    private readonly jwt: JwtService,
    private readonly db: PrismaService,
  ) {}

  getAuthorizationUrl(candidateId: string): string {
    const clientId = this.config.get<string>('LINKEDIN_CLIENT_ID');
    const redirectUri = this.config.get<string>('LINKEDIN_REDIRECT_URI');
    const jwtSecret = this.config.get<string>('JWT_CANDIDATE_SECRET');
    if (!clientId || !redirectUri) {
      throw new Error(
        'LINKEDIN_CLIENT_ID and LINKEDIN_REDIRECT_URI must be configured',
      );
    }
    if (!jwtSecret) {
      throw new Error('JWT_CANDIDATE_SECRET must be configured');
    }

    const state = this.jwt.sign(
      { candidateId, nonce: randomBytes(16).toString('hex') },
      { secret: jwtSecret, expiresIn: '10m' },
    );

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: LINKEDIN_SCOPES,
      state,
    });

    return `${LINKEDIN_AUTH_URL}?${params.toString()}`;
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
  ): Promise<LinkedInTokenResponse> {
    const clientId = this.config.get<string>('LINKEDIN_CLIENT_ID');
    const clientSecret = this.config.get<string>('LINKEDIN_CLIENT_SECRET');
    const redirectUri = this.config.get<string>('LINKEDIN_REDIRECT_URI');
    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error(
        'LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET and LINKEDIN_REDIRECT_URI must be configured',
      );
    }

    let response: Awaited<
      ReturnType<
        typeof firstValueFrom<
          import('axios').AxiosResponse<LinkedInTokenResponse>
        >
      >
    >;
    try {
      response = await firstValueFrom(
        this.http.post<LinkedInTokenResponse>(
          LINKEDIN_TOKEN_URL,
          new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
          }).toString(),
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
        ),
      );
    } catch (err: any) {
      this.logger.error(
        { status: err?.response?.status, data: err?.response?.data },
        'LinkedIn token exchange failed',
      );
      throw err;
    }

    const tokenResp = response.data;
    const expiresInMs =
      tokenResp.expires_in && tokenResp.expires_in > 0
        ? tokenResp.expires_in * 1000
        : 60 * 24 * 60 * 60 * 1000; // default 60 days

    await this.db.candidate.update({
      where: { id: candidateId },
      data: {
        linkedinOauthToken: tokenResp.access_token,
        linkedinRefreshToken: tokenResp.refresh_token ?? null,
        linkedinTokenExpiresAt: new Date(Date.now() + expiresInMs),
      },
    });

    this.logger.log({ candidateId }, 'LinkedIn OAuth tokens stored');
    return tokenResp;
  }

  async getUserInfo(accessToken: string): Promise<LinkedInUserInfo> {
    try {
      const response = await firstValueFrom(
        this.http.get<LinkedInUserInfo>(LINKEDIN_USERINFO_URL, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      );
      return response.data;
    } catch (err: any) {
      this.logger.error(
        { status: err?.response?.status, data: err?.response?.data },
        'LinkedIn userinfo failed',
      );
      throw err;
    }
  }

  async getCandidateToken(candidateId: string): Promise<string> {
    const candidate = await this.db.candidate.findUnique({
      where: { id: candidateId },
      select: {
        linkedinOauthToken: true,
        linkedinRefreshToken: true,
        linkedinTokenExpiresAt: true,
      },
    });

    if (!candidate?.linkedinOauthToken) {
      throw new UnprocessableEntityException({
        code: 'linkedin_not_connected',
        message: 'LinkedIn account not connected',
      });
    }

    const expiresAt = candidate.linkedinTokenExpiresAt;
    const needsRefresh = !expiresAt || Date.now() >= expiresAt.getTime();

    if (!needsRefresh) return candidate.linkedinOauthToken;

    if (!candidate.linkedinRefreshToken) {
      // LinkedIn OIDC basic scope doesn't issue refresh tokens — re-auth required
      throw new UnprocessableEntityException({
        code: 'linkedin_not_connected',
        message: 'LinkedIn token expired — please reconnect',
      });
    }

    let promise = this.inflightRefreshes.get(candidateId);
    if (!promise) {
      promise = this.refreshToken(
        candidateId,
        candidate.linkedinRefreshToken,
      ).finally(() => this.inflightRefreshes.delete(candidateId));
      this.inflightRefreshes.set(candidateId, promise);
    }
    return promise;
  }

  private async refreshToken(
    candidateId: string,
    refreshToken: string,
  ): Promise<string> {
    const clientId = this.config.get<string>('LINKEDIN_CLIENT_ID');
    const clientSecret = this.config.get<string>('LINKEDIN_CLIENT_SECRET');
    if (!clientId || !clientSecret) {
      throw new UnprocessableEntityException({
        code: 'linkedin_not_connected',
        message: 'LinkedIn OAuth credentials not configured',
      });
    }

    try {
      const response = await firstValueFrom(
        this.http.post<LinkedInTokenResponse>(
          LINKEDIN_TOKEN_URL,
          new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            client_id: clientId,
            client_secret: clientSecret,
          }).toString(),
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
        ),
      );

      const tokenResp = response.data;
      const expiresInMs =
        tokenResp.expires_in && tokenResp.expires_in > 0
          ? tokenResp.expires_in * 1000
          : 60 * 24 * 60 * 60 * 1000;

      await this.db.candidate.update({
        where: { id: candidateId },
        data: {
          linkedinOauthToken: tokenResp.access_token,
          linkedinRefreshToken: tokenResp.refresh_token ?? null,
          linkedinTokenExpiresAt: new Date(Date.now() + expiresInMs),
        },
      });

      this.logger.log({ candidateId }, 'LinkedIn OAuth token refreshed');
      return tokenResp.access_token;
    } catch (err: any) {
      this.logger.warn(
        { candidateId, err: err.message },
        'LinkedIn token refresh failed',
      );
      throw new UnprocessableEntityException({
        code: 'linkedin_not_connected',
        message: 'LinkedIn token refresh failed — please reconnect',
      });
    }
  }

  async disconnectLinkedIn(candidateId: string): Promise<void> {
    await this.db.candidate.update({
      where: { id: candidateId },
      data: {
        linkedinOauthToken: null,
        linkedinRefreshToken: null,
        linkedinTokenExpiresAt: null,
      },
    });
    this.logger.log({ candidateId }, 'LinkedIn OAuth tokens cleared');
  }
}
