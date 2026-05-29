import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  JobSourceAdapter,
  JobSearchParams,
  JobFetchResult,
  NormalizedJob,
} from '../adapters/job-source.adapter';

interface JSearchResponse {
  status: string;
  data?: JSearchJob[];
}

interface JSearchJob {
  job_id: string;
  job_title: string;
  employer_name: string;
  job_city?: string;
  job_country?: string;
  job_description?: string;
  job_required_skills?: string[];
  job_required_education?: { required_credential?: string };
  job_min_salary?: number;
  job_max_salary?: number;
  job_salary_currency?: string;
  job_salary_period?: string;
  job_employment_type?: string;
  job_is_remote?: boolean;
  job_posted_at_datetime_utc?: string;
  job_apply_link?: string;
  job_google_link?: string;
}

@Injectable()
export class LinkedInJobsAdapter extends JobSourceAdapter {
  private readonly logger = new Logger(LinkedInJobsAdapter.name);
  readonly sourceName = 'linkedin';

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    super();
  }

  private get apiKey(): string {
    return this.config.get<string>('JSEARCH_RAPIDAPI_KEY') ?? '';
  }

  async fetchPage(params: JobSearchParams): Promise<JobFetchResult> {
    if (!this.apiKey) {
      this.logger.warn(
        'JSEARCH_RAPIDAPI_KEY not configured — skipping LinkedIn jobs fetch',
      );
      return { jobs: [], hasMore: false };
    }

    const query =
      [params.query, params.location].filter(Boolean).join(' in ') ||
      'software engineer';

    let response: { data: JSearchResponse };
    try {
      response = await firstValueFrom(
        this.http.get<JSearchResponse>(
          'https://jsearch.p.rapidapi.com/search',
          {
            params: {
              query,
              page: params.page + 1,
              num_pages: 1,
              employment_types: 'FULLTIME,PARTTIME,CONTRACTOR',
            },
            headers: {
              'x-rapidapi-key': this.apiKey,
              'x-rapidapi-host': 'jsearch.p.rapidapi.com',
            },
          },
        ),
      );
    } catch (err: any) {
      this.logger.error(
        { page: params.page, error: err.message },
        'JSearch fetch failed',
      );
      throw err;
    }

    const data = response.data;
    if (data.status !== 'OK' || !Array.isArray(data.data)) {
      return { jobs: [], hasMore: false };
    }

    const jobs: NormalizedJob[] = data.data.map((j) => this.normalize(j));
    return { jobs, hasMore: data.data.length >= 10 };
  }

  private normalize(j: JSearchJob): NormalizedJob {
    const sourceUrl =
      j.job_apply_link ??
      j.job_google_link ??
      `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(j.job_title)}`;
    const location = [j.job_city, j.job_country].filter(Boolean).join(', ');

    return {
      sourceUrl,
      externalId: j.job_id,
      title: j.job_title,
      company: j.employer_name,
      location: location || undefined,
      description: j.job_description,
      skills: j.job_required_skills ?? [],
      employmentType: this.mapEmploymentType(j.job_employment_type),
      workMode: j.job_is_remote ? 'remote' : 'office',
      postedAt: j.job_posted_at_datetime_utc
        ? new Date(j.job_posted_at_datetime_utc)
        : undefined,
      rawPayload: j,
    };
  }

  private mapEmploymentType(type?: string): string | undefined {
    if (!type) return undefined;
    const map: Record<string, string> = {
      FULLTIME: 'full-time',
      PARTTIME: 'part-time',
      CONTRACTOR: 'contract',
      INTERN: 'internship',
    };
    return map[type] ?? 'full-time';
  }
}
