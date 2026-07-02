import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import type {
  HhMeResponse,
  HhResumeDetail,
  HhResumeSummary,
  HhResumeUpdateBody,
  HhResumeViewItem,
  HhSearchParams,
  HhVacancyDetail,
  HhVacancyListResponse,
} from './hh.types';
import { HH_BASE_URL, HH_HOST, HH_UZBEKISTAN_AREA_ID } from './hh.constants';

export type { HhVacancyListResponse };

@Injectable()
export class HhApplicantService {
  private readonly logger = new Logger(HhApplicantService.name);
  private readonly baseUrl = HH_BASE_URL;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  private get ua(): string {
    return this.config.get<string>('HH_USER_AGENT') ?? 'crewly/1.0';
  }

  private authHeaders(token: string) {
    return {
      Authorization: `Bearer ${token}`,
      'User-Agent': this.ua,
      'HH-User-Agent': this.ua,
    };
  }

  async searchVacancies(
    params: HhSearchParams,
    accessToken?: string,
  ): Promise<HhVacancyListResponse> {
    const token = accessToken ?? this.config.get<string>('HH_EMPLOYER_TOKEN');
    const resp = await firstValueFrom(
      this.http.get<HhVacancyListResponse>(`${this.baseUrl}/vacancies`, {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
          'User-Agent': this.ua,
          'HH-User-Agent': this.ua,
        },
        params: {
          host: HH_HOST,
          area: HH_UZBEKISTAN_AREA_ID,
          per_page: params.per_page ?? 20,
          page: params.page ?? 0,
          ...(params.text && { text: params.text }),
          ...(params.area &&
            /^\d+$/.test(params.area) && { area: params.area }),
          ...(params.experience && { experience: params.experience }),
          ...(params.salary && { salary: params.salary }),
          ...(params.order_by && { order_by: params.order_by }),
        },
      }),
    );
    return resp.data;
  }

  /** GET /me — HH user profile for connected candidate */
  async getMe(accessToken: string): Promise<HhMeResponse> {
    const resp = await firstValueFrom(
      this.http.get<HhMeResponse>(`${this.baseUrl}/me`, {
        headers: this.authHeaders(accessToken),
        params: { host: HH_HOST },
      }),
    );
    return resp.data;
  }

  /** GET /vacancies/{id} — full vacancy detail with description and skills */
  async getVacancy(
    accessToken: string,
    vacancyId: string,
  ): Promise<HhVacancyDetail> {
    const resp = await firstValueFrom(
      this.http.get<HhVacancyDetail>(`${this.baseUrl}/vacancies/${vacancyId}`, {
        headers: this.authHeaders(accessToken),
        params: { host: HH_HOST },
      }),
    );
    return resp.data;
  }

  /** GET /resumes?mine=true — list candidate's own resumes */
  async listMyResumes(accessToken: string): Promise<HhResumeSummary[]> {
    const resp = await firstValueFrom(
      this.http.get<{ items: HhResumeSummary[]; found: number }>(
        `${this.baseUrl}/resumes`,
        {
          headers: this.authHeaders(accessToken),
          params: { host: HH_HOST, mine: true, per_page: 10 },
        },
      ),
    );
    return resp.data.items ?? [];
  }

  /** GET /resumes/{id} — full resume detail using candidate token */
  async getResume(
    accessToken: string,
    resumeId: string,
  ): Promise<HhResumeDetail> {
    const resp = await firstValueFrom(
      this.http.get<HhResumeDetail>(`${this.baseUrl}/resumes/${resumeId}`, {
        headers: this.authHeaders(accessToken),
        params: { host: HH_HOST },
      }),
    );
    return resp.data;
  }

  /** POST /resumes/{id}/publish — publish resume */
  async publishResume(accessToken: string, resumeId: string): Promise<void> {
    await firstValueFrom(
      this.http.post(`${this.baseUrl}/resumes/${resumeId}/publish`, null, {
        headers: this.authHeaders(accessToken),
        params: { host: HH_HOST },
      }),
    );
  }

  /** PUT /resumes/{id} — update resume fields (e.g. skill_set) */
  async updateResume(
    accessToken: string,
    resumeId: string,
    body: HhResumeUpdateBody,
  ): Promise<void> {
    await firstValueFrom(
      this.http.put(`${this.baseUrl}/resumes/${resumeId}`, body, {
        headers: {
          ...this.authHeaders(accessToken),
          'Content-Type': 'application/json',
        },
        params: { host: HH_HOST },
      }),
    );
  }

  /** PUT /resumes/{id} with access=nobody — hide resume from employers */
  async hideResume(accessToken: string, resumeId: string): Promise<void> {
    await firstValueFrom(
      this.http.put(
        `${this.baseUrl}/resumes/${resumeId}`,
        { access: { type: { id: 'nobody' } } },
        {
          headers: {
            ...this.authHeaders(accessToken),
            'Content-Type': 'application/json',
          },
          params: { host: HH_HOST },
        },
      ),
    );
  }

  /** GET /resumes/{id}/views — how many employers viewed this resume */
  async getResumeViews(
    accessToken: string,
    resumeId: string,
  ): Promise<{ items: HhResumeViewItem[]; found: number }> {
    const resp = await firstValueFrom(
      this.http.get<{ items: HhResumeViewItem[]; found: number }>(
        `${this.baseUrl}/resumes/${resumeId}/views`,
        {
          headers: this.authHeaders(accessToken),
          params: { host: HH_HOST },
        },
      ),
    );
    return resp.data;
  }

  /** GET /resumes/{id}/similar_vacancies — vacancies that match the resume */
  async getResumeSimilarVacancies(
    accessToken: string,
    resumeId: string,
    params?: { page?: number; per_page?: number },
  ): Promise<HhVacancyListResponse> {
    const resp = await firstValueFrom(
      this.http.get<HhVacancyListResponse>(
        `${this.baseUrl}/resumes/${resumeId}/similar_vacancies`,
        {
          headers: this.authHeaders(accessToken),
          params: {
            host: HH_HOST,
            per_page: params?.per_page ?? 20,
            page: params?.page ?? 0,
          },
        },
      ),
    );
    return resp.data;
  }
}
