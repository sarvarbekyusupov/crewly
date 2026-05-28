import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from './decorators/public.decorator';

@Controller()
export class HealthController {
  constructor(private readonly db: PrismaService) {}

  @Get('health')
  @Public()
  async health() {
    try {
      await this.db.$queryRaw`SELECT 1`;
      return { status: 'ok', db: 'ok', ts: new Date().toISOString() };
    } catch {
      return { status: 'degraded', db: 'error', ts: new Date().toISOString() };
    }
  }
}
