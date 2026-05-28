import { Test, TestingModule } from '@nestjs/testing';
import { JobDiscoveryService } from './job-discovery.service';
import { PrismaService } from '../../prisma/prisma.service';

const makeAdapter = (sourceName: string, jobs: any[], hasMore = false) => ({
  sourceName,
  fetchPage: jest.fn().mockResolvedValue({ jobs, hasMore }),
});

const makeJob = (sourceUrl: string) => ({
  externalId: 'ext-1',
  sourceUrl,
  title: 'Dev',
  company: 'Acme',
  location: 'Tashkent',
  description: 'Job desc',
  skills: ['Node.js'],
  salaryMinUzs: null,
  salaryMaxUzs: null,
  employmentType: 'full_time',
  workMode: 'remote',
  postedAt: new Date(),
  rawPayload: {},
});

describe('JobDiscoveryService', () => {
  let service: JobDiscoveryService;
  let db: any;

  beforeEach(async () => {
    db = {
      discoveredJob: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
      },
      jobDiscoveryRun: { update: jest.fn().mockResolvedValue({}) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobDiscoveryService,
        { provide: PrismaService, useValue: db },
      ],
    }).compile();

    service = module.get(JobDiscoveryService);
  });

  it('creates new discovered job', async () => {
    const job = makeJob('https://hh.ru/job/1');
    const adapter = makeAdapter('hh.ru', [job]);

    const result = await service.discover('run-1', adapter, {}, 1);

    expect(db.discoveredJob.create).toHaveBeenCalled();
    expect(result).toMatchObject({ fetched: 1, created: 1, updated: 0 });
    expect(db.jobDiscoveryRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'completed', jobsNew: 1 }),
      }),
    );
  });

  it('updates existing discovered job', async () => {
    db.discoveredJob.findUnique.mockResolvedValue({ id: 'dj-1' });
    const job = makeJob('https://hh.ru/job/1');
    const adapter = makeAdapter('hh.ru', [job]);

    const result = await service.discover('run-1', adapter, {}, 1);

    expect(db.discoveredJob.update).toHaveBeenCalled();
    expect(result).toMatchObject({ updated: 1, created: 0 });
  });

  it('stops pagination when hasMore is false', async () => {
    const adapter = makeAdapter('hh.ru', []);
    await service.discover('run-1', adapter, {}, 5);
    expect(adapter.fetchPage).toHaveBeenCalledTimes(1);
  });

  it('breaks loop on fetchPage error', async () => {
    const adapter = {
      sourceName: 'hh.ru',
      fetchPage: jest.fn().mockRejectedValue(new Error('fail')),
    };
    await service.discover('run-1', adapter, {}, 3);
    expect(adapter.fetchPage).toHaveBeenCalledTimes(1);
    expect(db.jobDiscoveryRun.update).toHaveBeenCalled();
  });
});
