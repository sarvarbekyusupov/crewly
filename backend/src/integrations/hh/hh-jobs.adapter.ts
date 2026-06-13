import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
  JobSourceAdapter,
  JobSearchParams,
  JobFetchResult,
  NormalizedJob,
} from '../adapters/job-source.adapter';
import { HhVacancyItem, HhVacancyListResponse } from './hh.types';
import { HH_BASE_URL, HH_UZBEKISTAN_AREA_ID } from './hh.constants';

@Injectable()
export class HhJobsAdapter extends JobSourceAdapter {
  private readonly logger = new Logger(HhJobsAdapter.name);
  private readonly baseUrl = HH_BASE_URL;
  readonly sourceName = 'hh.uz';

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    super();
  }

  private get headers() {
    const token = this.config.get('HH_EMPLOYER_TOKEN');
    const userAgent = this.config.get('HH_USER_AGENT') ?? 'crewly/1.0';
    return {
      ...(token && { Authorization: `Bearer ${token}` }),
      'User-Agent': userAgent,
      'HH-User-Agent': userAgent,
    };
  }

  async fetchPage(params: JobSearchParams): Promise<JobFetchResult> {
    let response: { data: HhVacancyListResponse };
    try {
      response = await firstValueFrom(
        this.http.get<HhVacancyListResponse>(`${this.baseUrl}/vacancies`, {
          params: {
            area: HH_UZBEKISTAN_AREA_ID,
            per_page: 50,
            page: params.page,
            ...(params.query && { text: params.query }),
            ...(params.location &&
              /^\d+$/.test(params.location) && { area: params.location }),
          },
          headers: this.headers,
        }),
      );
    } catch (err: any) {
      this.logger.error(
        { page: params.page, error: err.message },
        'HH vacancies fetch failed',
      );
      throw err;
    }

    const data = response.data;
    const jobs: NormalizedJob[] = data.items.map((item) =>
      this.normalize(item),
    );

    return {
      jobs,
      hasMore: data.page < data.pages - 1,
    };
  }

  private normalize(item: HhVacancyItem): NormalizedJob {
    const description = [
      item.snippet?.responsibility,
      item.snippet?.requirement,
    ]
      .filter(Boolean)
      .join('\n\n');

    const skills = (item.key_skills ?? []).map((s) => s.name);

    const workMode = this.mapSchedule(item.schedule?.name);
    const employmentType = this.mapEmployment(item.employment?.name);

    let salaryMinUzs: bigint | undefined;
    let salaryMaxUzs: bigint | undefined;
    if (item.salary?.currency === 'UZS') {
      if (item.salary.from) salaryMinUzs = BigInt(item.salary.from);
      if (item.salary.to) salaryMaxUzs = BigInt(item.salary.to);
    }

    return {
      sourceUrl: item.alternate_url,
      externalId: item.id,
      title: item.name,
      company: item.employer.name,
      location: item.area?.name,
      description,
      skills,
      salaryMinUzs,
      salaryMaxUzs,
      employmentType,
      workMode,
      postedAt: item.published_at ? new Date(item.published_at) : undefined,
      rawPayload: item,
    };
  }

  async fetchVacancySkills(vacancyId: string): Promise<string[]> {
    try {
      const response = await firstValueFrom(
        this.http.get<{ key_skills?: { name: string }[] }>(
          `${this.baseUrl}/vacancies/${vacancyId}`,
          { headers: this.headers },
        ),
      );
      return (response.data.key_skills ?? []).map((s) => s.name);
    } catch (err: any) {
      this.logger.warn(
        { vacancyId, error: err.message },
        'Vacancy detail fetch failed',
      );
      return [];
    }
  }

  async getSimilarVacancies(vacancyId: string): Promise<NormalizedJob[]> {
    try {
      const response = await firstValueFrom(
        this.http.get<HhVacancyListResponse>(
          `${this.baseUrl}/vacancies/${vacancyId}/similar_vacancies`,
          { headers: this.headers, params: { per_page: 20 } },
        ),
      );
      return response.data.items.map((item) => this.normalize(item));
    } catch (err: any) {
      this.logger.warn(
        { vacancyId, err: err.message },
        'Similar vacancies fetch failed',
      );
      return [];
    }
  }

  private mapSchedule(name?: string): string | undefined {
    if (!name) return undefined;
    const lower = name.toLowerCase();
    if (lower.includes('удаленн') || lower.includes('remote')) return 'remote';
    if (lower.includes('гибкий') || lower.includes('flexible')) return 'hybrid';
    return 'office';
  }

  private mapEmployment(name?: string): string | undefined {
    if (!name) return undefined;
    const lower = name.toLowerCase();
    if (lower.includes('полн') || lower.includes('full')) return 'full-time';
    if (lower.includes('частичн') || lower.includes('part')) return 'part-time';
    if (lower.includes('контракт') || lower.includes('contract'))
      return 'contract';
    return undefined;
  }
}
