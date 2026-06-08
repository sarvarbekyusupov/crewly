import { Controller, Get } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from './decorators/public.decorator';
import { QUEUES } from '../workers/queue-names';

@Controller()
@SkipThrottle()
export class HealthController {
  constructor(
    private readonly db: PrismaService,
    @InjectQueue(QUEUES.CLEANUP) private readonly queue: Queue,
  ) {}

  @Get('health')
  @Public()
  async health() {
    let dbOk = true;
    let redisOk = true;

    try {
      await this.db.$queryRaw`SELECT 1`;
    } catch {
      dbOk = false;
    }

    try {
      await this.queue.client.ping();
    } catch {
      redisOk = false;
    }

    return {
      status: dbOk && redisOk ? 'ok' : 'degraded',
      db: dbOk ? 'ok' : 'error',
      redis: redisOk ? 'ok' : 'error',
      ts: new Date().toISOString(),
    };
  }
}
