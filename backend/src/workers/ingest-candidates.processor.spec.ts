import { Test, TestingModule } from '@nestjs/testing';
import { IngestCandidatesProcessor } from './ingest-candidates.processor';
import { PrismaService } from '../prisma/prisma.service';
import { SourcingAgent } from '../modules/agents/sourcing.agent';
import { HhAdapter } from '../integrations/hh/hh.adapter';
import { LinkedInAdapter } from '../integrations/linkedin/linkedin-client.service';
import { AdapterIngestService } from '../integrations/adapters/adapter-ingest.service';
import { NonRetryableError } from './errors';

const makeJob = (data: object) => ({ data, opts: {} }) as any;

describe('IngestCandidatesProcessor', () => {
  let processor: IngestCandidatesProcessor;
  let db: any;
  let agent: any;
  let hhAdapter: any;
  let linkedinAdapter: any;
  let adapterIngest: { ingest: jest.Mock };

  beforeEach(async () => {
    db = {
      candidateSource: { findUnique: jest.fn() },
      ingestionRun: {
        create: jest.fn().mockResolvedValue({ id: 'run-1' }),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    agent = {};
    hhAdapter = { fetchCandidates: jest.fn() };
    linkedinAdapter = { fetchCandidates: jest.fn() };
    adapterIngest = { ingest: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IngestCandidatesProcessor,
        { provide: PrismaService, useValue: db },
        { provide: SourcingAgent, useValue: agent },
        { provide: HhAdapter, useValue: hhAdapter },
        { provide: LinkedInAdapter, useValue: linkedinAdapter },
        { provide: AdapterIngestService, useValue: adapterIngest },
      ],
    }).compile();

    processor = module.get(IngestCandidatesProcessor);
  });

  it('throws NonRetryableError for unknown source', async () => {
    const job = makeJob({ source: 'unknown' });
    await expect(processor.handle(job)).rejects.toThrow(NonRetryableError);
  });

  it('throws NonRetryableError when source record not found in DB', async () => {
    db.candidateSource.findUnique.mockResolvedValue(null);
    const job = makeJob({ source: 'hh.ru' });
    await expect(processor.handle(job)).rejects.toThrow(NonRetryableError);
  });

  it('creates ingestion run and ingests candidates from hh.ru', async () => {
    db.candidateSource.findUnique.mockResolvedValue({
      id: 'source-1',
      name: 'hh.ru',
    });
    const job = makeJob({
      source: 'hh.ru',
      specialization: '1.221',
      location: 'Tashkent',
      maxPages: 3,
    });

    await processor.handle(job);

    expect(db.ingestionRun.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sourceId: 'source-1',
          status: 'running',
        }),
      }),
    );
    expect(adapterIngest.ingest).toHaveBeenCalledWith(
      'run-1',
      hhAdapter,
      expect.any(Object),
      3,
    );
  });

  it('creates ingestion run and ingests candidates from linkedin', async () => {
    db.candidateSource.findUnique.mockResolvedValue({
      id: 'source-2',
      name: 'linkedin',
    });
    const job = makeJob({ source: 'linkedin', keywords: 'Node.js developer' });

    await processor.handle(job);

    expect(adapterIngest.ingest).toHaveBeenCalledWith(
      'run-1',
      linkedinAdapter,
      expect.any(Object),
      undefined,
    );
  });

  it('marks run as failed when ingestion throws', async () => {
    db.candidateSource.findUnique.mockResolvedValue({
      id: 'source-1',
      name: 'hh.ru',
    });
    adapterIngest.ingest.mockRejectedValue(new Error('Connection refused'));

    const job = makeJob({ source: 'hh.ru' });
    await expect(processor.handle(job)).rejects.toThrow('Connection refused');

    expect(db.ingestionRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'failed',
          error: 'Connection refused',
        }),
      }),
    );
  });
});
