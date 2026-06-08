import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';
import { QUEUES } from '../workers/queue-names';

describe('HealthController', () => {
  let controller: HealthController;
  let db: { $queryRaw: jest.Mock };

  beforeEach(async () => {
    db = { $queryRaw: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: PrismaService, useValue: db },
        {
          provide: getQueueToken(QUEUES.CLEANUP),
          useValue: { client: { ping: jest.fn().mockResolvedValue('PONG') } },
        },
      ],
    }).compile();

    controller = module.get(HealthController);
  });

  it('returns ok status when DB query succeeds', async () => {
    db.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
    const result = await controller.health();
    expect(result.status).toBe('ok');
    expect(result.db).toBe('ok');
  });

  it('returns degraded status when DB query fails', async () => {
    db.$queryRaw.mockRejectedValue(new Error('Connection refused'));
    const result = await controller.health();
    expect(result.status).toBe('degraded');
    expect(result.db).toBe('error');
  });
});
