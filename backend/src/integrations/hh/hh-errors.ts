export class HhQuotaError extends Error {
  readonly code = 'HH_QUOTA_EXCEEDED';
  // withRetry checks err?.response?.status — set 403 so it is not mistaken for a transient error
  readonly response = { status: 403 } as const;

  constructor(resumeId: string) {
    super(
      `Resume ${resumeId} requires paid contact reveal (HH quota). Use resume.actions to explicitly reveal.`,
    );
    this.name = 'HhQuotaError';
  }
}
