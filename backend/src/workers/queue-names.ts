export const QUEUES = {
  INGEST_CANDIDATES: 'ingest-candidates',
  PARSE_CANDIDATE: 'parse-candidate',
  EMBED_CANDIDATE: 'embed-candidate',
  PARSE_JOB: 'parse-job',
  MATCH_CANDIDATES: 'match-candidates',
  SEND_OUTREACH: 'send-outreach',
  ADVANCE_SCREENING: 'advance-screening',
  GENERATE_DOSSIER: 'generate-dossier',
  CLEANUP: 'cleanup',
  DISCOVER_JOBS: 'discover-jobs',
  SCORE_SEEKER_JOBS: 'score-seeker-jobs',
  AUTO_APPLY: 'auto-apply',
  SYNC_HH_STATUS: 'sync-hh-status',
  ENRICH_JOB: 'enrich-job',
} as const;

export const JOB_NAMES = {
  SEND_OUTREACH: 'send',
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];
