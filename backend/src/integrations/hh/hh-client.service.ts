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
  HhResumeViewItem,
} from './hh.types';

@Injectable()
export class HhClientService {
  private readonly logger = new Logger(HhClientService.name);
  private readonly baseUrl = 'https://api.hh.uz';

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  private get headers() {
    const token = this.config.get('HH_EMPLOYER_TOKEN');
    const userAgent = this.config.get('HH_USER_AGENT');
    return {
      ...(token && { Authorization: `Bearer ${token}` }),
      'User-Agent': userAgent,
      'HH-User-Agent': userAgent,
    };
  }

  async searchResumes(params: HhSearchParams): Promise<HhResumeListResponse> {
    const response = await firstValueFrom(
      this.http.get<HhResumeListResponse>(`${this.baseUrl}/resumes`, {
        params: {
          area: '97', // Uzbekistan
          per_page: 100,
          ...params,
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
          headers: this.headers,
        }),
      );
      return response.data;
    } catch (err: any) {
      const status = err?.response?.status;
      const errors: Array<{ type: string }> = err?.response?.data?.errors ?? [];
      const isQuota = errors.some((e) => e.type === 'api_access_payment');
      if (status === 403 && isQuota) {
        const quotaErr = new Error(
          `Resume ${id} requires paid contact reveal (HH quota). Use resume.actions to explicitly reveal.`,
        );
        (quotaErr as any).code = 'HH_QUOTA_EXCEEDED';
        throw quotaErr;
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
    return resume.contact?.find((c) => c.type.id === 'email')?.value;
  }

  extractPhone(resume: HhResumeDetail): string | undefined {
    const phone = resume.contact?.find((c) => c.type.id === 'cell');
    return phone?.value?.formatted;
  }

  async getVacancyDetail(vacancyId: string): Promise<HhVacancyDetail> {
    const response = await firstValueFrom(
      this.http.get<HhVacancyDetail>(`${this.baseUrl}/vacancies/${vacancyId}`, {
        headers: this.headers,
      }),
    );
    return response.data;
  }

  async getPotentialResumes(vacancyId: string): Promise<HhResumeSummary[]> {
    const response = await firstValueFrom(
      this.http.get<HhResumeListResponse>(
        `${this.baseUrl}/vacancies/${vacancyId}/potential_resumes`,
        { headers: this.headers, params: { per_page: 100 } },
      ),
    );
    return response.data.items ?? [];
  }

  /** Resumes that were viewed by our employer account, optionally filtered by vacancy. */
  async getResumeViews(vacancyId?: string): Promise<HhResumeViewItem[]> {
    const employerId = this.config.get<string>('HH_EMPLOYER_ID') ?? '';
    const response = await firstValueFrom(
      this.http.get<{ items: HhResumeViewItem[] }>(
        `${this.baseUrl}/employers/${employerId}/resumes/views`,
        {
          headers: this.headers,
          params: {
            per_page: 100,
            ...(vacancyId && { vacancy_id: vacancyId }),
          },
        },
      ),
    );
    return response.data.items ?? [];
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
          { headers: this.headers, params: { resume_id: resumeId } },
        ),
      );
      return true;
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 404) return false;
      throw err;
    }
  }

  /** Returns info about the authenticated user (employer). */
  async getMe(token: string): Promise<HhMeResponse> {
    const userAgent = this.config.get<string>('HH_USER_AGENT') ?? 'crewly/1.0';
    const response = await firstValueFrom(
      this.http.get<HhMeResponse>(`${this.baseUrl}/me`, {
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
