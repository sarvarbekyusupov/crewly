import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';

export interface HhApplyResult {
  negotiationId: string;
}

@Injectable()
export class HhApplyService {
  private readonly logger = new Logger(HhApplyService.name);
  private readonly baseUrl = 'https://api.hh.ru';

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Apply to a vacancy using the candidate's HH OAuth token.
   * Requires: hhOauthToken (candidate's personal token) + hhResumeId.
   * Returns the negotiation ID for tracking.
   */
  async apply(params: {
    vacancyId: string;
    hhOauthToken: string;
    hhResumeId: string;
    coverLetter?: string;
  }): Promise<HhApplyResult> {
    const userAgent = this.config.get('HH_USER_AGENT') ?? 'crewly/1.0';

    const response = await firstValueFrom(
      this.http.post(
        `${this.baseUrl}/negotiations`,
        {
          vacancy_id: params.vacancyId,
          resume_id: params.hhResumeId,
          ...(params.coverLetter && { message: params.coverLetter }),
        },
        {
          headers: {
            Authorization: `Bearer ${params.hhOauthToken}`,
            'User-Agent': userAgent,
            'HH-User-Agent': userAgent,
            'Content-Type': 'application/json',
          },
        },
      ),
    );

    // HH returns 201 Created with a Location header containing the negotiation URL
    const location: string = response.headers['location'] ?? '';
    const negotiationId = location.split('/').pop() ?? 'unknown';
    this.logger.log(
      { vacancyId: params.vacancyId, negotiationId },
      'HH application submitted',
    );
    return { negotiationId };
  }

  /** Fetch the candidate's resumes to get the primary resume ID */
  async getResumeId(hhOauthToken: string): Promise<string | null> {
    try {
      const response = await firstValueFrom(
        this.http.get<{ items: Array<{ id: string; title: string }> }>(
          `${this.baseUrl}/resumes/mine`,
          {
            headers: {
              Authorization: `Bearer ${hhOauthToken}`,
              'User-Agent': this.config.get('HH_USER_AGENT') ?? 'crewly/1.0',
            },
          },
        ),
      );
      return response.data.items[0]?.id ?? null;
    } catch {
      return null;
    }
  }
}
