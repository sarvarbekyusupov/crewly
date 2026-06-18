import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ConfigService } from '@nestjs/config';
import { QUEUES } from '../workers/queue-names';
import { INGEST_JOB_OPTIONS } from '../workers/queue-options';

@Injectable()
export class CronService implements OnModuleInit {
  private readonly logger = new Logger(CronService.name);

  constructor(
    @InjectQueue(QUEUES.INGEST_CANDIDATES) private readonly ingestQueue: Queue,
    @InjectQueue(QUEUES.CLEANUP) private readonly cleanupQueue: Queue,
    @InjectQueue(QUEUES.SYNC_HH_STATUS) private readonly syncHhQueue: Queue,
    @InjectQueue(QUEUES.DISCOVER_JOBS)
    private readonly discoverJobsQueue: Queue,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    try {
      const specializations = (
        this.config.get<string>('HH_SPECIALIZATIONS') ?? '1.221'
      )
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      for (const spec of specializations) {
        await this.ingestQueue.add(
          { source: 'hh.ru', specialization: spec, maxPages: 5 },
          {
            ...INGEST_JOB_OPTIONS,
            repeat: { cron: '0 */4 * * *' },
            jobId: `hh-${spec}-scheduled`,
          },
        );
      }

      await this.cleanupQueue.add(
        'expire-sessions',
        {},
        {
          repeat: { cron: '0 3 * * *' },
          jobId: 'cleanup-sessions',
        },
      );

      await this.cleanupQueue.add(
        'expire-idempotency-keys',
        {},
        {
          repeat: { cron: '15 3 * * *' },
          jobId: 'cleanup-idempotency',
        },
      );

      await this.cleanupQueue.add(
        'mark-invoices-overdue',
        {},
        {
          repeat: { cron: '0 1 * * *' },
          jobId: 'mark-invoices-overdue',
        },
      );

      await this.cleanupQueue.add(
        'check-guarantee-expiry',
        {},
        {
          repeat: { cron: '0 6 * * *' },
          jobId: 'cleanup-guarantee-expiry',
        },
      );

      await this.cleanupQueue.add(
        'send-invoice-reminders',
        {},
        {
          repeat: { cron: '0 9 * * *' },
          jobId: 'invoice-reminders',
        },
      );

      await this.syncHhQueue.add(
        {},
        {
          repeat: { cron: '0 * * * *' },
          jobId: 'sync-hh-status-hourly',
        },
      );

      // area 2759 = Tashkent on hh.uz
      await this.discoverJobsQueue.add(
        { source: 'hh.ru', location: '2759', maxPages: 5 },
        {
          ...INGEST_JOB_OPTIONS,
          repeat: { cron: '30 */4 * * *' },
          jobId: 'discover-jobs-hh-scheduled',
        },
      );

      this.logger.log('Cron jobs registered');
    } catch (err: any) {
      this.logger.error(err.message, 'Failed to register cron jobs');
    }
  }
}
