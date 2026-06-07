import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { HhResumeViewItem } from './hh.types';

interface HhSalary {
  from?: number;
  to?: number;
  currency: string;
  gross: boolean;
}

interface HhVacancyBody {
  name: string;
  area: { id: string };
  employer: { id: string };
  description: string;
  type: { id: string };
  experience: { id: string };
  employment: { id: string };
  schedule: { id: string };
  salary?: HhSalary;
  key_skills?: { name: string }[];
}

export interface HhJobSnapshot {
  id: string;
  title: string;
  description: string;
  requiredSkills: string[];
  salaryMin?: bigint | null;
  salaryMax?: bigint | null;
  salaryCurrency?: string | null;
  minExperienceYears?: number | null;
  employmentType?: string | null;
  workMode?: string | null;
}

@Injectable()
export class HhVacancyService {
  private readonly logger = new Logger(HhVacancyService.name);
  private readonly baseUrl = 'https://api.hh.ru';

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  private get headers() {
    const token = this.config.get<string>('HH_EMPLOYER_TOKEN');
    const userAgent = this.config.get<string>('HH_USER_AGENT') ?? 'my-hr/1.0';
    return {
      ...(token && { Authorization: `Bearer ${token}` }),
      'User-Agent': userAgent,
      'HH-User-Agent': userAgent,
      'Content-Type': 'application/json',
    };
  }

  private buildBody(job: HhJobSnapshot): HhVacancyBody {
    const employerId = this.config.get<string>('HH_EMPLOYER_ID') ?? '';

    const body: HhVacancyBody = {
      name: job.title,
      area: { id: '97' }, // Uzbekistan
      employer: { id: employerId },
      description: job.description,
      type: { id: 'open' },
      experience: { id: this.mapExperience(job.minExperienceYears) },
      employment: { id: this.mapEmployment(job.employmentType) },
      schedule: { id: this.mapSchedule(job.workMode) },
    };

    if (job.salaryMin || job.salaryMax) {
      body.salary = {
        ...(job.salaryMin && { from: Number(job.salaryMin) }),
        ...(job.salaryMax && { to: Number(job.salaryMax) }),
        currency: job.salaryCurrency ?? 'UZS',
        gross: false,
      };
    }

    if (job.requiredSkills.length) {
      body.key_skills = job.requiredSkills
        .slice(0, 30)
        .map((s) => ({ name: s }));
    }

    return body;
  }

  /** Create a vacancy on HH. Returns the HH vacancy ID. */
  async createVacancy(job: HhJobSnapshot): Promise<string> {
    const body = this.buildBody(job);

    const response = await firstValueFrom(
      this.http.post(`${this.baseUrl}/vacancies`, body, {
        headers: this.headers,
      }),
    );

    // HH returns 201 with Location: /vacancies/{id}
    const location: string = response.headers['location'] ?? '';
    const hhVacancyId = location.split('/').pop() ?? '';

    this.logger.log({ jobId: job.id, hhVacancyId }, 'HH vacancy created');
    return hhVacancyId;
  }

  /** Sync updated job fields to an existing HH vacancy. */
  async updateVacancy(hhVacancyId: string, job: HhJobSnapshot): Promise<void> {
    const body = this.buildBody(job);

    await firstValueFrom(
      this.http.put(`${this.baseUrl}/vacancies/${hhVacancyId}`, body, {
        headers: this.headers,
      }),
    );

    this.logger.log({ hhVacancyId }, 'HH vacancy updated');
  }

  /** Activate a draft vacancy (make it visible to job seekers). */
  async publishVacancy(hhVacancyId: string): Promise<void> {
    await firstValueFrom(
      this.http.post(
        `${this.baseUrl}/vacancies/${hhVacancyId}/publish`,
        {},
        { headers: this.headers },
      ),
    );
    this.logger.log({ hhVacancyId }, 'HH vacancy published');
  }

  /** Archive (close) a vacancy on HH. */
  async archiveVacancy(hhVacancyId: string): Promise<void> {
    await firstValueFrom(
      this.http.put(
        `${this.baseUrl}/vacancies/${hhVacancyId}/archive`,
        {},
        { headers: this.headers },
      ),
    );
    this.logger.log({ hhVacancyId }, 'HH vacancy archived');
  }

  /** Move a vacancy to hidden (HH "delete" = add to hidden list). */
  async deleteVacancy(hhVacancyId: string): Promise<void> {
    const employerId = this.config.get<string>('HH_EMPLOYER_ID') ?? '';
    await firstValueFrom(
      this.http.put(
        `${this.baseUrl}/employers/${employerId}/vacancies/hidden`,
        { vacancy_id: hhVacancyId },
        { headers: this.headers },
      ),
    );
    this.logger.log({ hhVacancyId }, 'HH vacancy moved to hidden');
  }

  /** Resumes viewed by candidates on this vacancy (warm outreach leads). */
  async getResumeViews(hhVacancyId: string): Promise<HhResumeViewItem[]> {
    const employerId = this.config.get<string>('HH_EMPLOYER_ID') ?? '';
    const response = await firstValueFrom(
      this.http.get<{ items: HhResumeViewItem[] }>(
        `${this.baseUrl}/employers/${employerId}/resumes/views`,
        {
          headers: this.headers,
          params: { vacancy_id: hhVacancyId, per_page: 100 },
        },
      ),
    );
    return response.data.items ?? [];
  }

  /** Fetch view and response counts for a vacancy. */
  async getVacancyStats(
    hhVacancyId: string,
  ): Promise<{ views: number; responses: number }> {
    const response = await firstValueFrom(
      this.http.get<any>(`${this.baseUrl}/vacancies/${hhVacancyId}/stats`, {
        headers: this.headers,
      }),
    );
    return {
      views: response.data?.views?.total ?? 0,
      responses: response.data?.responses?.total ?? 0,
    };
  }

  /** Extend the posting period of a vacancy. */
  async prolongVacancy(hhVacancyId: string): Promise<void> {
    await firstValueFrom(
      this.http.post(
        `${this.baseUrl}/vacancies/${hhVacancyId}/prolongate`,
        {},
        { headers: this.headers },
      ),
    );
    this.logger.log({ hhVacancyId }, 'HH vacancy prolonged');
  }

  private mapExperience(years?: number | null): string {
    if (!years || years < 1) return 'noExperience';
    if (years <= 3) return 'between1And3';
    if (years <= 6) return 'between3And6';
    return 'moreThan6';
  }

  private mapEmployment(type?: string | null): string {
    switch (type) {
      case 'part-time':
        return 'part';
      case 'contract':
        return 'project';
      default:
        return 'full';
    }
  }

  private mapSchedule(mode?: string | null): string {
    switch (mode) {
      case 'remote':
        return 'remote';
      case 'hybrid':
        return 'flexible';
      default:
        return 'fullDay';
    }
  }
}
