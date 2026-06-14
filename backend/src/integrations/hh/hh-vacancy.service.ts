import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { HhResumeViewItem, HhVacancyStats } from './hh.types';
import { HH_BASE_URL, HH_UZBEKISTAN_AREA_ID } from './hh.constants';
import { withRetry } from '../../common/utils/async.utils';

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

export interface HhActiveVacancyItem {
  id: string;
  name: string;
  alternate_url: string;
  area?: { name: string };
  published_at?: string;
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
  private readonly baseUrl = HH_BASE_URL;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  private get headers() {
    const token = this.config.get<string>('HH_EMPLOYER_TOKEN');
    const userAgent = this.config.get<string>('HH_USER_AGENT') ?? 'crewly/1.0';
    return {
      ...(token && { Authorization: `Bearer ${token}` }),
      'User-Agent': userAgent,
      'HH-User-Agent': userAgent,
    };
  }

  private get jsonHeaders() {
    return { ...this.headers, 'Content-Type': 'application/json' };
  }

  private buildBody(job: HhJobSnapshot): HhVacancyBody {
    const employerId = this.config.get<string>('HH_EMPLOYER_ID');
    if (!employerId) throw new Error('HH_EMPLOYER_ID must be configured');

    const body: HhVacancyBody = {
      name: job.title,
      area: { id: HH_UZBEKISTAN_AREA_ID },
      employer: { id: employerId },
      description: job.description,
      type: { id: 'open' },
      experience: { id: this.mapExperience(job.minExperienceYears) },
      employment: { id: this.mapEmployment(job.employmentType) },
      schedule: { id: this.mapSchedule(job.workMode) },
    };

    if (job.salaryMin != null || job.salaryMax != null) {
      body.salary = {
        ...(job.salaryMin != null && { from: Number(job.salaryMin) }),
        ...(job.salaryMax != null && { to: Number(job.salaryMax) }),
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
        headers: this.jsonHeaders,
      }),
    );

    // HH returns 201 with Location: /vacancies/{id}
    const location: string = response.headers['location'] ?? '';
    const hhVacancyId = location.split('/').pop() ?? '';
    if (!hhVacancyId) {
      throw new Error(
        `HH returned no Location header after vacancy creation (job ${job.id})`,
      );
    }

    this.logger.log({ jobId: job.id, hhVacancyId }, 'HH vacancy created');
    return hhVacancyId;
  }

  /** Sync updated job fields to an existing HH vacancy. */
  async updateVacancy(hhVacancyId: string, job: HhJobSnapshot): Promise<void> {
    const body = this.buildBody(job);

    await firstValueFrom(
      this.http.put(`${this.baseUrl}/vacancies/${hhVacancyId}`, body, {
        headers: this.jsonHeaders,
      }),
    );

    this.logger.log({ hhVacancyId }, 'HH vacancy updated');
  }

  // TODO: POST /vacancies/{id}/publish does not exist in HH public API.
  // Draft workflow: POST /vacancy-drafts → POST /vacancy-drafts/{id}/vacancies.
  // Replace this method with draft-based publish when employer draft flow is implemented.
  /** Activate a draft vacancy (make it visible to job seekers). */
  async publishVacancy(hhVacancyId: string): Promise<void> {
    await firstValueFrom(
      this.http.post(
        `${this.baseUrl}/vacancies/${hhVacancyId}/publish`,
        {},
        { headers: this.jsonHeaders },
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
        { headers: this.jsonHeaders },
      ),
    );
    this.logger.log({ hhVacancyId }, 'HH vacancy archived');
  }

  /** Move a vacancy to hidden (HH "delete" = add to hidden list). */
  async deleteVacancy(hhVacancyId: string): Promise<void> {
    const employerId = this.config.get<string>('HH_EMPLOYER_ID');
    if (!employerId) throw new Error('HH_EMPLOYER_ID must be configured');
    // HH operation: add-vacancy-to-hidden — vacancy ID goes in path, not body.
    await firstValueFrom(
      this.http.put(
        `${this.baseUrl}/employers/${employerId}/vacancies/hidden/${hhVacancyId}`,
        {},
        { headers: this.jsonHeaders },
      ),
    );
    this.logger.log({ hhVacancyId }, 'HH vacancy moved to hidden');
  }

  /** Resumes viewed by candidates on this vacancy (warm outreach leads). */
  async getResumeViews(hhVacancyId: string): Promise<HhResumeViewItem[]> {
    const employerId = this.config.get<string>('HH_EMPLOYER_ID');
    if (!employerId) throw new Error('HH_EMPLOYER_ID must be configured');
    const MAX_PAGES = 50;
    const all: HhResumeViewItem[] = [];
    let page = 0;
    while (page < MAX_PAGES) {
      const response = await withRetry(() =>
        firstValueFrom(
          this.http.get<{ items: HhResumeViewItem[]; pages?: number }>(
            `${this.baseUrl}/employers/${employerId}/resumes/views`,
            {
              headers: this.headers,
              params: { vacancy_id: hhVacancyId, per_page: 100, page },
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

  /** Fetch view and response counts for a vacancy. */
  async getVacancyStats(
    hhVacancyId: string,
  ): Promise<{ views: number; responses: number }> {
    const response = await firstValueFrom(
      this.http.get<HhVacancyStats>(
        `${this.baseUrl}/vacancies/${hhVacancyId}/stats`,
        { headers: this.headers },
      ),
    );
    return {
      views: response.data?.views?.value ?? 0,
      responses: response.data?.responses?.value ?? 0,
    };
  }

  /** List all employer's active vacancies on HH (paginates to exhaustion). */
  async listActiveVacancies(): Promise<HhActiveVacancyItem[]> {
    const employerId = this.config.get<string>('HH_EMPLOYER_ID');
    if (!employerId) throw new Error('HH_EMPLOYER_ID must be configured');
    const all: HhActiveVacancyItem[] = [];
    let page = 0;

    while (true) {
      const response = await withRetry(() =>
        firstValueFrom(
          this.http.get<{
            items: HhActiveVacancyItem[];
            pages: number;
            page: number;
          }>(`${this.baseUrl}/employers/${employerId}/vacancies/active`, {
            headers: this.headers,
            params: { per_page: 100, page },
          }),
        ),
      );
      all.push(...(response.data.items ?? []));
      if (page >= (response.data.pages ?? 1) - 1) break;
      page++;
    }

    return all;
  }

  /** Restore a vacancy from the hidden list (HH operation: restore-vacancy-from-hidden). */
  async restoreVacancy(hhVacancyId: string): Promise<void> {
    // HH OpenAPI names this operation "restore-vacancy-from-hidden", not archive.
    await firstValueFrom(
      this.http.put(
        `${this.baseUrl}/vacancies/${hhVacancyId}/restore_from_hidden`,
        {},
        { headers: this.jsonHeaders },
      ),
    );
    this.logger.log({ hhVacancyId }, 'HH vacancy restored from hidden');
  }

  /** Extend the posting period of a vacancy. */
  async prolongVacancy(hhVacancyId: string): Promise<void> {
    await firstValueFrom(
      this.http.post(
        `${this.baseUrl}/vacancies/${hhVacancyId}/prolongate`,
        {},
        { headers: this.jsonHeaders },
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
