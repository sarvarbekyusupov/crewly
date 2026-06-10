import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import type {
  HhResumeDetail,
  HhResumeUpdateBody,
  HhResumeViewItem,
} from './hh.types';

@Injectable()
export class HhResumeService {
  private readonly logger = new Logger(HhResumeService.name);
  private readonly baseUrl = 'https://api.hh.uz';

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
    // Strip HH read-only fields — HH rejects PUT with these present
    const {
      id: _id,
      url: _url,
      alternate_url: _alt,
      status: _status,
      access: _access,
      blocked_site: _bs,
      can_publish_or_update: _cpu,
      next_publish_at: _npa,
      updated_at: _ua,
      created_at: _ca,
      views: _v,
      download: _dl,
      resume_locale: _rl,
      progress: _p,
      marked: _m,
      title_suggestions: _ts,
      moderation_note: _mn,
      actions: _ac,
      owner: _ow,
      ...writable
    } = current as any;
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
