import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface IdempotencyResult<T> {
  cached: boolean;
  value: T;
}

@Injectable()
export class IdempotencyService {
  constructor(private readonly db: PrismaService) {}

  /**
   * Run `fn` once per `key`. Returns stored JSON response on duplicate delivery.
   */
  async execute<T extends Record<string, unknown>>(
    key: string,
    ttlHours: number,
    fn: () => Promise<T>,
  ): Promise<IdempotencyResult<T>> {
    const existing = await this.db.idempotencyKey.findUnique({
      where: { key },
    });
    if (existing?.response) {
      return { cached: true, value: existing.response as T };
    }

    const value = await fn();
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

    await this.db.idempotencyKey.upsert({
      where: { key },
      create: { key, response: value as Prisma.InputJsonValue, expiresAt },
      update: { response: value as Prisma.InputJsonValue, expiresAt },
    });

    return { cached: false, value };
  }
}
