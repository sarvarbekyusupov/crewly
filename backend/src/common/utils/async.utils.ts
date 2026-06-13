export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 2,
  delayMs = 800,
): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const status: number | undefined = err?.response?.status;
      const isTransient = !status || status === 429 || status >= 500;
      if (attempt === retries || !isTransient) throw err;
      const retryAfterSec = err?.response?.headers?.['retry-after'];
      const waitMs = retryAfterSec
        ? parseInt(retryAfterSec, 10) * 1000
        : delayMs * (attempt + 1);
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }
  throw new Error('unreachable');
}

export async function runConcurrentCapped<T>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  let index = 0;
  async function worker(): Promise<void> {
    while (index < items.length) {
      const item = items[index++];
      await fn(item);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, worker),
  );
}
