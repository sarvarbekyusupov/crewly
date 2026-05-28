import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { HhClientService } from './hh-client.service';

const TOKEN_REFRESH_THRESHOLD_MS = 24 * 60 * 60 * 1000; // refresh if < 1 day remaining

@Injectable()
export class HhTokenService {
  private readonly logger = new Logger(HhTokenService.name);

  constructor(
    private readonly db: PrismaService,
    private readonly hh: HhClientService,
  ) {}

  /**
   * Returns a valid HH access token for the candidate.
   * Proactively refreshes if the token expires within 24 hours.
   * Throws if the candidate has no HH token configured.
   */
  async getValidToken(candidateId: string): Promise<string> {
    const candidate = await this.db.candidate.findUniqueOrThrow({
      where: { id: candidateId },
      select: {
        id: true,
        hhOauthToken: true,
        hhRefreshToken: true,
        hhTokenExpiresAt: true,
      },
    });

    if (!candidate.hhOauthToken) {
      throw new Error(
        `Candidate ${candidateId} has no HH OAuth token configured`,
      );
    }

    const needsRefresh =
      candidate.hhRefreshToken &&
      candidate.hhTokenExpiresAt &&
      candidate.hhTokenExpiresAt.getTime() - Date.now() <
        TOKEN_REFRESH_THRESHOLD_MS;

    if (!needsRefresh) {
      return candidate.hhOauthToken;
    }

    try {
      const refreshed = await this.hh.refreshCandidateToken(
        candidate.hhRefreshToken!,
      );

      const expiresAt = new Date(Date.now() + refreshed.expires_in * 1000);
      await this.db.candidate.update({
        where: { id: candidateId },
        data: {
          hhOauthToken: refreshed.access_token,
          hhRefreshToken: refreshed.refresh_token,
          hhTokenExpiresAt: expiresAt,
        },
      });

      this.logger.log({ candidateId }, 'HH token refreshed');
      return refreshed.access_token;
    } catch (err: any) {
      this.logger.error(
        { candidateId, error: err.message },
        'HH token refresh failed — using existing token',
      );
      return candidate.hhOauthToken;
    }
  }
}
