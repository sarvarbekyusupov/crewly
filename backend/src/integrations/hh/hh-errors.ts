export class HhQuotaError extends Error {
  readonly code = 'HH_QUOTA_EXCEEDED';

  constructor(resumeId: string) {
    super(
      `Resume ${resumeId} requires paid contact reveal (HH quota). Use resume.actions to explicitly reveal.`,
    );
    this.name = 'HhQuotaError';
  }
}
