import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import type {
  HhMeResponse,
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
}
