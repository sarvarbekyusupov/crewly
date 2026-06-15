import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { HH_BASE_URL, HH_HOST } from './hh.constants';
import type {
  HhApplicantComment,
  HhApplicantCommentsResponse,
} from './hh.types';

export type { HhApplicantComment, HhApplicantCommentsResponse };

@Injectable()
export class HhCommentsService {
  private readonly logger = new Logger(HhCommentsService.name);
  private readonly baseUrl = HH_BASE_URL;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  private get headers() {
    const token = this.config.get<string>('HH_EMPLOYER_TOKEN');
    const ua =
      this.config.get<string>('HH_USER_AGENT') ??
      'Crewly/1.0 (contact@crewly.uz)';
    return {
      ...(token && { Authorization: `Bearer ${token}` }),
      'User-Agent': ua,
      'HH-User-Agent': ua,
    };
  }

  /**
   * GET /applicant_comments/{applicant_id}
   * Requires paid employer access. applicantId = `owner.id` from resume.
   */
  async listComments(
    applicantId: string,
    params?: { page?: number; per_page?: number; order_by?: string },
  ): Promise<HhApplicantCommentsResponse> {
    const resp = await firstValueFrom(
      this.http.get<HhApplicantCommentsResponse>(
        `${this.baseUrl}/applicant_comments/${applicantId}`,
        {
          headers: this.headers,
          params: { host: HH_HOST, per_page: 50, page: 0, ...params },
        },
      ),
    );
    return resp.data;
  }

  /**
   * POST /applicant_comments/{applicant_id}
   * access_type: 'manager' (only visible to you) | 'company' (visible to all managers)
   */
  async addComment(
    applicantId: string,
    text: string,
    accessType: 'manager' | 'company' = 'manager',
  ): Promise<HhApplicantComment> {
    const body = new URLSearchParams({ text, access_type: accessType });
    const resp = await firstValueFrom(
      this.http.post<HhApplicantComment>(
        `${this.baseUrl}/applicant_comments/${applicantId}`,
        body.toString(),
        {
          headers: {
            ...this.headers,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          params: { host: HH_HOST },
        },
      ),
    );
    this.logger.log({ applicantId }, 'HH applicant comment added');
    return resp.data;
  }

  /** PUT /applicant_comments/{applicant_id}/{comment_id} — only comment author can update */
  async updateComment(
    applicantId: string,
    commentId: string,
    updates: { text?: string; access_type?: string },
  ): Promise<void> {
    const body = new URLSearchParams();
    if (updates.text !== undefined) body.set('text', updates.text);
    if (updates.access_type !== undefined)
      body.set('access_type', updates.access_type);
    await firstValueFrom(
      this.http.put(
        `${this.baseUrl}/applicant_comments/${applicantId}/${commentId}`,
        body.toString(),
        {
          headers: {
            ...this.headers,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          params: { host: HH_HOST },
        },
      ),
    );
    this.logger.log({ applicantId, commentId }, 'HH applicant comment updated');
  }

  /** DELETE /applicant_comments/{applicant_id}/{comment_id} — only comment author can delete */
  async deleteComment(applicantId: string, commentId: string): Promise<void> {
    await firstValueFrom(
      this.http.delete(
        `${this.baseUrl}/applicant_comments/${applicantId}/${commentId}`,
        { headers: this.headers, params: { host: HH_HOST } },
      ),
    );
    this.logger.log({ applicantId, commentId }, 'HH applicant comment deleted');
  }
}
