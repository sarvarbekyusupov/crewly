import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { CronService } from './cron.service';
import { QUEUES } from '../workers/queue-names';

describe('CronService', () => {
  let service: CronService;
  let ingestQueue: { add: jest.Mock };
  let cleanupQueue: { add: jest.Mock };
  let syncHhQueue: { add: jest.Mock };

  beforeEach(async () => {
    ingestQueue = { add: jest.fn().mockResolvedValue({}) };
    cleanupQueue = { add: jest.fn().mockResolvedValue({}) };
    syncHhQueue = { add: jest.fn().mockResolvedValue({}) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CronService,
        {
          provide: getQueueToken(QUEUES.INGEST_CANDIDATES),
          useValue: ingestQueue,
        },
        { provide: getQueueToken(QUEUES.CLEANUP), useValue: cleanupQueue },
        {
          provide: getQueueToken(QUEUES.SYNC_HH_STATUS),
          useValue: syncHhQueue,
        },
      ],
    }).compile();

    service = module.get(CronService);
  });

  it('registers all cron jobs on init', async () => {
    await service.onModuleInit();

    expect(ingestQueue.add).toHaveBeenCalled();
    expect(cleanupQueue.add).toHaveBeenCalledTimes(5);
    expect(syncHhQueue.add).toHaveBeenCalled();
  });

  it('handles queue errors gracefully', async () => {
    ingestQueue.add.mockRejectedValue(new Error('Redis down'));
    await expect(service.onModuleInit()).resolves.toBeUndefined();
  });

  it('uses HH_SPECIALIZATIONS env var when set', async () => {
    const old = process.env.HH_SPECIALIZATIONS;
    process.env.HH_SPECIALIZATIONS = '1.221,2.34';
    await service.onModuleInit();
    expect(ingestQueue.add).toHaveBeenCalledTimes(2);
    process.env.HH_SPECIALIZATIONS = old;
  });
});
