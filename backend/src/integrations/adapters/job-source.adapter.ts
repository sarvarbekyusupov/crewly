export interface NormalizedJob {
  sourceUrl: string;
  externalId?: string;
  title: string;
  company: string;
  location?: string;
  description?: string;
  skills: string[];
  salaryMinUzs?: bigint;
  salaryMaxUzs?: bigint;
  employmentType?: string;
  workMode?: string;
  postedAt?: Date;
  rawPayload: unknown;
}

export interface JobFetchResult {
  jobs: NormalizedJob[];
  hasMore: boolean;
}

export interface JobSearchParams {
  query?: string;
  location?: string;
  page: number;
}

export abstract class JobSourceAdapter {
  abstract readonly sourceName: string;
  abstract fetchPage(params: JobSearchParams): Promise<JobFetchResult>;
}
