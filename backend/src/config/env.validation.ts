import { z } from 'zod';

export const EnvSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(3000),
  PUBLIC_URL: z.string().url().default('http://localhost:3000'),

  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1).optional(),

  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),

  SESSION_SECRET: z.string().min(32),

  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().default(900),

  GOOGLE_CLIENT_ID: z.string().optional().or(z.literal('')),
  GOOGLE_CLIENT_SECRET: z.string().optional().or(z.literal('')),
  GOOGLE_CALLBACK_URL: z.string().url().optional().or(z.literal('')),

  GROQ_API_KEY: z.string().optional().or(z.literal('')),
  ANTHROPIC_API_KEY: z.string().optional().default(''),
  OPENAI_API_KEY: z.string().optional().default(''),

  HH_EMPLOYER_TOKEN: z.string().optional().or(z.literal('')),
  HH_EMPLOYER_ID: z.string().optional().or(z.literal('')),
  HH_CLIENT_ID: z.string().optional().or(z.literal('')),
  HH_CLIENT_SECRET: z.string().optional().or(z.literal('')),
  HH_REDIRECT_URI: z.string().url().optional().or(z.literal('')),
  HH_USER_AGENT: z.string().default('AIRecruiting/1.0 (contact@yourdomain.uz)'),

  TELEGRAM_BOT_TOKEN: z.string().optional().or(z.literal('')),
  TELEGRAM_WEBHOOK_SECRET: z.string().optional().or(z.literal('')),

  RESEND_API_KEY: z.string().optional().or(z.literal('')),
  FROM_EMAIL: z.string().email().default('noreply@myhr.uz'),
  BULL_BOARD_PASSWORD: z.string().min(8).default('changeme_board'),

  S3_ENDPOINT: z.string().optional().or(z.literal('')),
  S3_ACCESS_KEY: z.string().optional().or(z.literal('')),
  S3_SECRET_KEY: z.string().optional().or(z.literal('')),
  S3_BUCKET: z.string().optional().or(z.literal('')),

  FRONTEND_URL: z.string().url().default('http://localhost:3001'),

  PAYMENT_WEBHOOK_SECRET: z.string().optional().or(z.literal('')),

  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .default('info'),

  SENTRY_DSN: z.string().optional().or(z.literal('')),
});

export type Env = z.infer<typeof EnvSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = EnvSchema.safeParse(config);
  if (!result.success) {
    const errors = result.error.issues
      .map((i) => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Environment validation failed:\n${errors}`);
  }
  return result.data;
}
