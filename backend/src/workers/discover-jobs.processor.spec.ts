import { Test, TestingModule } from '@nestjs/testing';
import { DiscoverJobsProcessor } from './discover-jobs.processor';
import { PrismaService } from '../prisma/prisma.service';
import { SourcingAgent } from '../modules/agents/sourcing.agent';
import { HhJobsAdapter } from '../integrations/hh/hh-jobs.adapter';
import { LinkedInJobsAdapter } from '../integrations/linkedin/linkedin-jobs.adapter';
import { JobDiscoveryService } from '../integrations/adapters/job-discovery.service';
import { NonRetryableError } from './errors';

const makeJob = (data: object) => ({ data, opts: {} }) as any;

describe('DiscoverJobsProcessor', () => {
  let processor: DiscoverJobsProcessor;
  let db: any;
  let agent: any;
  let hhJobsAdapter: any;
  let linkedinJobsAdapter: any;
  let jobDiscovery: { discover: jest.Mock };

  beforeEach(async () => {
    db = {
      candidate: { findUnique: jest.fn() },
      jobDiscoveryRun: {
        create: jest.fn().mockResolvedValue({ id: 'run-1' }),
        update: jest.fn().mockResolvedValue({}),
      },
      discoveredJob: { findMany: jest.fn().mockResolvedValue([]) },
    };
    agent = { generateJobSearchQueries: jest.fn() };
    hhJobsAdapter = { fetchJobs: jest.fn() };
    linkedinJobsAdapter = { fetchJobs: jest.fn() };
    jobDiscovery = { discover: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscoverJobsProcessor,
        { provide: PrismaService, useValue: db },
        { provide: SourcingAgent, useValue: agent },
        { provide: HhJobsAdapter, useValue: hhJobsAdapter },
        { provide: LinkedInJobsAdapter, useValue: linkedinJobsAdapter },
        { provide: JobDiscoveryService, useValue: jobDiscovery },
      ],
    }).compile();

    processor = module.get(DiscoverJobsProcessor);
  });

  it('throws NonRetryableError for unknown source', async () => {
    const job = makeJob({ source: 'unknown-source' });
    await expect(processor.handle(job)).rejects.toThrow(NonRetryableError);
  });

  it('creates a run record and discovers jobs from hh.ru', async () => {
    const job = makeJob({
      source: 'hh.ru',
      query: 'Node.js',
      location: 'Tashkent',
      maxPages: 2,
    });
    await processor.handle(job);

    expect(db.jobDiscoveryRun.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ source: 'hh.ru', query: 'Node.js' }),
      }),
    );
    expect(jobDiscovery.discover).toHaveBeenCalledWith(
      'run-1',
      hhJobsAdapter,
      expect.any(Object),
      2,
    );
  });

  it('creates a run record and discovers jobs from linkedin', async () => {
    const job = makeJob({ source: 'linkedin', query: 'React' });
    await processor.handle(job);

    expect(jobDiscovery.discover).toHaveBeenCalledWith(
      'run-1',
      linkedinJobsAdapter,
      expect.any(Object),
      undefined,
    );
  });

  it('marks run as failed when discovery throws', async () => {
    db.jobDiscoveryRun.create.mockResolvedValue({ id: 'run-1' });
    jobDiscovery.discover.mockRejectedValue(new Error('API timeout'));

    const job = makeJob({ source: 'hh.ru' });
    await expect(processor.handle(job)).rejects.toThrow('API timeout');

    expect(db.jobDiscoveryRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'failed',
          error: 'API timeout',
        }),
      }),
    );
  });
});
