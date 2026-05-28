export interface NormalizedProfile {
  externalId: string;
  sourceUrl?: string;
  fullName: string;
  email?: string;
  phone?: string;
  rawText: string;
  city?: string;
  expectedSalaryUzs?: bigint;
  rawPayload: unknown;
}

export interface AdapterFetchResult {
  profiles: NormalizedProfile[];
  hasMore: boolean;
}

export interface AdapterSearchParams {
  query?: string;
  specialization?: string;
  location?: string;
  page: number;
}

export abstract class CandidateSourceAdapter {
  abstract readonly sourceName: string;
  abstract fetchPage(params: AdapterSearchParams): Promise<AdapterFetchResult>;
}
