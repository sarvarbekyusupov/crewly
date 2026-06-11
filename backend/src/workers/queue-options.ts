import type { JobOptions } from 'bull';

// LLM queues: 5 attempts, 15s → 30s → 60s → 120s → 240s exponential backoff
export const LLM_JOB_OPTIONS: Partial<JobOptions> = {
  attempts: 5,
  backoff: { type: 'exponential', delay: 15_000 },
};

// hh.ru ingestion: 3 attempts with a longer initial delay (hh.ru rate limits are strict)
export const INGEST_JOB_OPTIONS: Partial<JobOptions> = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 30_000 },
};

// hh.ru vacancy detail enrichment: 3 attempts, deduplicated by jobId
export const ENRICH_JOB_OPTIONS: Partial<JobOptions> = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 10_000 },
  removeOnComplete: true,
  removeOnFail: false,
};
