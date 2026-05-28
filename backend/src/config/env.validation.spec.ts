import { validateEnv } from './env.validation';

const minimalEnv = {
  DATABASE_URL: 'postgresql://localhost/test',
  SESSION_SECRET: 'a'.repeat(32),
  JWT_ACCESS_SECRET: 'b'.repeat(32),
  JWT_REFRESH_SECRET: 'c'.repeat(32),
};

describe('validateEnv', () => {
  it('parses valid minimal environment', () => {
    const result = validateEnv(minimalEnv);
    expect(result.NODE_ENV).toBe('development');
    expect(result.PORT).toBe(3000);
  });

  it('applies production NODE_ENV', () => {
    const result = validateEnv({ ...minimalEnv, NODE_ENV: 'production' });
    expect(result.NODE_ENV).toBe('production');
  });

  it('throws on missing required DATABASE_URL', () => {
    const { DATABASE_URL: _, ...rest } = minimalEnv;
    expect(() => validateEnv(rest)).toThrow('Environment validation failed');
  });

  it('throws on SESSION_SECRET too short', () => {
    expect(() =>
      validateEnv({ ...minimalEnv, SESSION_SECRET: 'short' }),
    ).toThrow('Environment validation failed');
  });

  it('coerces PORT from string to number', () => {
    const result = validateEnv({ ...minimalEnv, PORT: '4000' });
    expect(result.PORT).toBe(4000);
  });

  it('uses default REDIS_URL', () => {
    const result = validateEnv(minimalEnv);
    expect(result.REDIS_URL).toBe('redis://localhost:6379');
  });
});
