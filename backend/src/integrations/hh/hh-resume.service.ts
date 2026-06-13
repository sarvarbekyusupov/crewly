import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import type {
  HhResumeDetail,
  HhResumeUpdateBody,
  HhResumeViewItem,
} from './hh.types';
import { HH_BASE_URL } from './hh.constants';

@Injectable()
export class HhResumeService {
  private readonly logger = new Logger(HhResumeService.name);
  private readonly baseUrl = HH_BASE_URL;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  private get ua(): string {
    return this.config.get<string>('HH_USER_AGENT') ?? 'crewly/1.0';
  }

  private headers(accessToken: string) {
    return {
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': this.ua,
      'HH-User-Agent': this.ua,
    };
  }

  async getResume(
    accessToken: string,
    resumeId: string,
  ): Promise<HhResumeDetail> {
    const resp = await firstValueFrom(
      this.http.get<HhResumeDetail>(`${this.baseUrl}/resumes/${resumeId}`, {
        headers: this.headers(accessToken),
      }),
    );
    return resp.data;
  }

  async publishResume(accessToken: string, resumeId: string): Promise<void> {
    await firstValueFrom(
      this.http.put(`${this.baseUrl}/resumes/${resumeId}/publish`, null, {
        headers: this.headers(accessToken),
      }),
    );
    this.logger.log({ resumeId }, 'HH resume published');
  }

  async hideResume(accessToken: string, resumeId: string): Promise<void> {
    await firstValueFrom(
      this.http.put(`${this.baseUrl}/resumes/${resumeId}/hide`, null, {
        headers: this.headers(accessToken),
      }),
    );
    this.logger.log({ resumeId }, 'HH resume hidden');
  }

  async getResumeViews(
    accessToken: string,
    resumeId: string,
  ): Promise<{ items: HhResumeViewItem[]; found: number }> {
    const resp = await firstValueFrom(
      this.http.get<{ items: HhResumeViewItem[]; found: number }>(
        `${this.baseUrl}/resumes/${resumeId}/views`,
        { headers: this.headers(accessToken) },
      ),
    );
    return resp.data;
  }

  /** PUT /resumes/{id} — update specific fields on HH resume (GET-merge-PUT) */
  async updateResume(
    accessToken: string,
    resumeId: string,
    data: HhResumeUpdateBody,
  ): Promise<void> {
    const current = await this.getResume(accessToken, resumeId);

    if (current.can_publish_or_update === false) {
      throw new Error(
        `Resume ${resumeId} cannot be updated right now (can_publish_or_update=false)`,
      );
    }

    // Whitelist: strip known HH read-only fields before PUT
    // HH rejects requests that include these server-generated fields
    const READ_ONLY_FIELDS = new Set([
      'id',
      'url',
      'alternate_url',
      'status',
      'access',
      'blocked_site',
      'can_publish_or_update',
      'next_publish_at',
      'updated_at',
      'created_at',
      'views',
      'download',
      'resume_locale',
      'progress',
      'marked',
      'title_suggestions',
      'moderation_note',
      'actions',
      'owner',
    ]);

    const writable = Object.fromEntries(
      Object.entries(current as object).filter(
        ([k]) => !READ_ONLY_FIELDS.has(k),
      ),
    );
    const merged = { ...writable, ...data };

    await firstValueFrom(
      this.http.put(`${this.baseUrl}/resumes/${resumeId}`, merged, {
        headers: {
          ...this.headers(accessToken),
          'Content-Type': 'application/json',
        },
      }),
    );
    this.logger.log({ resumeId }, 'HH resume updated');
  }
}
