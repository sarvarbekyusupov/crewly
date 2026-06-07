import { randomBytes, createHash } from 'crypto';

export { REFRESH_TOKEN_TTL_MS } from '../auth.constants';

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generateRawToken(): string {
  return randomBytes(32).toString('hex');
}
