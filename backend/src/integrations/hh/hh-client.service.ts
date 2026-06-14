import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  HhResumeDetail,
  HhResumeListResponse,
  HhResumeSummary,
  HhSearchParams,
  HhVacancyDetail,
  HhMeResponse,
} from './hh.types';
import { HH_BASE_URL, HH_HOST, HH_UZBEKISTAN_AREA_ID } from './hh.constants';
import { HhQuotaError } from './hh-errors';
import { withRetry } from '../../common/utils/async.utils';

@Injectable()
export class HhClientService {
  private readonly logger = new Logger(HhClientService.name);
  private readonly baseUrl = HH_BASE_URL;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  private get headers() {
    const token = this.config.get('HH_EMPLOYER_TOKEN');
    const userAgent = this.config.get('HH_USER_AGENT') ?? 'crewly/1.0';
    return {
      ...(token && { Authorization: `Bearer ${token}` }),
      'User-Agent': userAgent,
      'HH-User-Agent': userAgent,
    };
  }

  async searchResumes(params: HhSearchParams): Promise<HhResumeListResponse> {
    const { area, ...restParams } = params;
    const resolvedArea =
      area && /^\d+$/.test(area) ? area : HH_UZBEKISTAN_AREA_ID;
    const response = await firstValueFrom(
      this.http.get<HhResumeListResponse>(`${this.baseUrl}/resumes`, {
        params: {
          host: HH_HOST,
          area: resolvedArea,
          per_page: 100,
          ...restParams,
        },
        headers: this.headers,
      }),
    );
    return response.data;
  }

  async getResume(id: string): Promise<HhResumeDetail> {
    try {
      const response = await firstValueFrom(
        this.http.get<HhResumeDetail>(`${this.baseUrl}/resumes/${id}`, {
          params: { host: HH_HOST },
          headers: this.headers,
        }),
      );
      return response.data;
    } catch (err: any) {
      const status = err?.response?.status;
      const errors: Array<{ type: string }> = err?.response?.data?.errors ?? [];
      const isQuota = errors.some((e) => e.type === 'api_access_payment');
      if (status === 403 && isQuota) {
        throw new HhQuotaError(id);
      }
      throw err;
    }
  }

  extractResumeText(resume: HhResumeDetail): string {
    const parts: string[] = [];

    const name = [resume.first_name, resume.last_name, resume.middle_name]
      .filter(Boolean)
      .join(' ');
    if (name) parts.push(`Имя: ${name}`);
    if (resume.title) parts.push(`Должность: ${resume.title}`);
    if (resume.area?.name) parts.push(`Город: ${resume.area.name}`);
    if (resume.salary)
      parts.push(`Зарплата: ${resume.salary.amount} ${resume.salary.currency}`);
    if (resume.total_experience)
      parts.push(
        `Опыт: ${Math.round(resume.total_experience.months / 12)} лет`,
      );
    if (resume.skill_set?.length)
      parts.push(`Навыки: ${resume.skill_set.join(', ')}`);
    if (resume.skills) parts.push(`О себе: ${resume.skills}`);

    if (resume.experience?.length) {
      parts.push('\nОпыт работы:');
      for (const exp of resume.experience) {
        parts.push(
          `  ${exp.position} в ${exp.company} (${exp.start} - ${exp.end ?? 'н.в.'})`,
        );
        if (exp.description) parts.push(`  ${exp.description.slice(0, 300)}`);
      }
    }

    return parts.join('\n');
  }

  extractEmail(resume: HhResumeDetail): string | undefined {
    const contact = resume.contact?.find((c) => c.type.id === 'email');
    return typeof contact?.value === 'string' ? contact.value : undefined;
  }

  extractPhone(resume: HhResumeDetail): string | undefined {
    const contact = resume.contact?.find((c) => c.type.id === 'cell');
    if (!contact?.value || typeof contact.value === 'string') return undefined;
    return contact.value.formatted;
  }

  async getVacancyDetail(vacancyId: string): Promise<HhVacancyDetail> {
    const response = await firstValueFrom(
      this.http.get<HhVacancyDetail>(`${this.baseUrl}/vacancies/${vacancyId}`, {
        params: { host: HH_HOST },
        headers: this.headers,
      }),
    );
    return response.data;
  }

  async getPotentialResumes(vacancyId: string): Promise<HhResumeSummary[]> {
    const all: HhResumeSummary[] = [];
    let page = 0;
    while (true) {
      const response = await withRetry(() =>
        firstValueFrom(
          this.http.get<HhResumeListResponse>(
            `${this.baseUrl}/vacancies/${vacancyId}/potential_resumes`,
            {
              headers: this.headers,
              params: { host: HH_HOST, per_page: 100, page },
            },
          ),
        ),
      );
      all.push(...(response.data.items ?? []));
      if (page >= (response.data.pages ?? 1) - 1) break;
      page++;
    }
    return all;
  }

  /** Returns true if the resume is suitable for the vacancy per HH's algorithm. */
  async checkSuitableResume(
    vacancyId: string,
    resumeId: string,
  ): Promise<boolean> {
    try {
      await firstValueFrom(
        this.http.get(
          `${this.baseUrl}/vacancies/${vacancyId}/check_suitable_resume`,
          {
            headers: this.headers,
            params: { host: HH_HOST, resume_id: resumeId },
          },
        ),
      );
      return true;
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 404) return false;
      throw err;
    }
  }

  /** Returns info about the authenticated user. */
  async getMe(token: string): Promise<HhMeResponse> {
    const userAgent = this.config.get<string>('HH_USER_AGENT') ?? 'crewly/1.0';
    const response = await firstValueFrom(
      this.http.get<HhMeResponse>(`${this.baseUrl}/me`, {
        params: { host: HH_HOST },
        headers: {
          Authorization: `Bearer ${token}`,
          'User-Agent': userAgent,
          'HH-User-Agent': userAgent,
        },
      }),
    );
    return response.data;
  }
}
