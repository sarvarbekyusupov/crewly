import { randomBytes, createHash } from 'crypto';

export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generateRawToken(): string {
  return randomBytes(32).toString('hex');
}
