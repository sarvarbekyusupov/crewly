import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import type {
  HhMeResponse,
  HhNegotiationsResponse,
  HhNegotiationMessagesResponse,
  HhSearchParams,
  HhVacancyDetail,
  HhVacancyListResponse,
} from './hh.types';
import { HH_BASE_URL, HH_HOST, HH_UZBEKISTAN_AREA_ID } from './hh.constants';

export type { HhNegotiationsResponse, HhVacancyListResponse };

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

  async getNegotiations(
    accessToken: string,
    params?: { page?: number; per_page?: number },
  ): Promise<HhNegotiationsResponse> {
    const resp = await firstValueFrom(
      this.http.get<HhNegotiationsResponse>(`${this.baseUrl}/negotiations`, {
        headers: this.authHeaders(accessToken),
        params: { host: HH_HOST, per_page: 20, page: 0, ...params },
      }),
    );
    return resp.data;
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

  /** POST /negotiations — candidate applies to a vacancy; returns negotiation ID */
  async applyToVacancy(
    accessToken: string,
    vacancyId: string,
    resumeId: string,
    message?: string,
  ): Promise<string | null> {
    const params = new URLSearchParams({
      vacancy_id: vacancyId,
      resume_id: resumeId,
    });
    if (message) params.set('message', message);

    const resp = await firstValueFrom(
      this.http.post(`${this.baseUrl}/negotiations`, params.toString(), {
        headers: {
          ...this.authHeaders(accessToken),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        params: { host: HH_HOST },
      }),
    );
    // HH returns Location: /negotiations/{id} on 201
    const location = resp.headers?.['location'] as string | undefined;
    const negotiationId = location ? (location.split('/').pop() ?? null) : null;
    this.logger.log(
      { vacancyId, negotiationId },
      'Candidate applied to HH vacancy',
    );
    return negotiationId;
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

  // TODO: HH deprecated this endpoint. Migrate to new chat API when available.
  /** GET /negotiations/{id}/messages — message thread for applicant */
  async getNegotiationMessages(
    accessToken: string,
    negotiationId: string,
  ): Promise<HhNegotiationMessagesResponse> {
    const resp = await firstValueFrom(
      this.http.get<HhNegotiationMessagesResponse>(
        `${this.baseUrl}/negotiations/${negotiationId}/messages`,
        { headers: this.authHeaders(accessToken), params: { host: HH_HOST } },
      ),
    );
    return resp.data;
  }

  // TODO: HH deprecated this endpoint. Migrate to new chat API when available.
  /** POST /negotiations/{id}/messages — send message as applicant */
  async postNegotiationMessage(
    accessToken: string,
    negotiationId: string,
    message: string,
  ): Promise<void> {
    await firstValueFrom(
      this.http.post(
        `${this.baseUrl}/negotiations/${negotiationId}/messages`,
        new URLSearchParams({ message }).toString(),
        {
          headers: {
            ...this.authHeaders(accessToken),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          params: { host: HH_HOST },
        },
      ),
    );
    this.logger.log({ negotiationId }, 'Candidate sent HH negotiation message');
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

  /** GET /resumes/{id}/similar_vacancies — vacancies matching candidate's resume */
  async getSimilarVacancies(
    accessToken: string,
    resumeId: string,
    params?: { page?: number; per_page?: number },
  ): Promise<HhVacancyListResponse> {
    const resp = await firstValueFrom(
      this.http.get<HhVacancyListResponse>(
        `${this.baseUrl}/resumes/${resumeId}/similar_vacancies`,
        {
          headers: this.authHeaders(accessToken),
          params: { host: HH_HOST, per_page: 20, page: 0, ...params },
        },
      ),
    );
    return resp.data;
  }

  /** DELETE /negotiations/{id} — candidate withdraws application */
  async deleteNegotiation(
    accessToken: string,
    negotiationId: string,
  ): Promise<void> {
    await firstValueFrom(
      this.http.delete(`${this.baseUrl}/negotiations/${negotiationId}`, {
        headers: this.authHeaders(accessToken),
        params: { host: HH_HOST },
      }),
    );
    this.logger.log({ negotiationId }, 'Candidate withdrew HH negotiation');
  }
}
