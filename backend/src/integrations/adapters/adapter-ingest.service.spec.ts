import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AdapterIngestService } from './adapter-ingest.service';
import { PrismaService } from '../../prisma/prisma.service';
import { QUEUES } from '../../workers/queue-names';

const makeAdapter = (sourceName: string, profiles: any[], hasMore = false) => ({
  sourceName,
  fetchPage: jest.fn().mockResolvedValue({ profiles, hasMore }),
});

describe('AdapterIngestService', () => {
  let service: AdapterIngestService;
  let db: any;
  let parseQueue: { add: jest.Mock };

  beforeEach(async () => {
    db = {
      candidateSource: { findUnique: jest.fn() },
      candidate: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
        update: jest.fn(),
      },
      candidateRawPayload: { create: jest.fn().mockResolvedValue({}) },
      ingestionRun: { update: jest.fn().mockResolvedValue({}) },
    };
    parseQueue = { add: jest.fn().mockResolvedValue({}) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdapterIngestService,
        { provide: PrismaService, useValue: db },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
        {
          provide: getQueueToken(QUEUES.PARSE_CANDIDATE),
          useValue: parseQueue,
        },
      ],
    }).compile();

    service = module.get(AdapterIngestService);
  });

  it('counts failed when source not found in DB', async () => {
    db.candidateSource.findUnique.mockResolvedValue(null);
    const profile = {
      externalId: 'ext-1',
      fullName: 'Alice',
      email: 'a@x.com',
      phone: null,
      rawText: '',
      sourceUrl: 'https://hh.ru/1',
      rawPayload: {},
      city: null,
      expectedSalaryUzs: null,
    };
    const adapter = makeAdapter('hh.ru', [profile]);
    const result = await service.ingest('run-1', adapter, {}, 1);
    expect(result).toMatchObject({
      fetched: 1,
      created: 0,
      updated: 0,
      failed: 1,
    });
  });

  it('creates new candidate and enqueues parse job', async () => {
    db.candidateSource.findUnique.mockResolvedValue({
      id: 'src-1',
      name: 'hh.ru',
    });
    const profile = {
      externalId: 'ext-1',
      fullName: 'Alice',
      email: 'alice@example.com',
      phone: null,
      rawText: 'resume',
      sourceUrl: 'https://hh.ru/1',
      rawPayload: {},
      city: 'Tashkent',
      expectedSalaryUzs: null,
    };
    db.candidate.create.mockResolvedValue({ id: 'cand-1' });

    const adapter = makeAdapter('hh.ru', [profile]);
    const result = await service.ingest('run-1', adapter, {}, 1);

    expect(db.candidate.create).toHaveBeenCalled();
    expect(parseQueue.add).toHaveBeenCalledWith(
      { candidateId: 'cand-1' },
      expect.any(Object),
    );
    expect(db.ingestionRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'completed',
          candidatesNew: 1,
        }),
      }),
    );
    expect(result).toMatchObject({
      fetched: 1,
      created: 1,
      updated: 0,
      failed: 0,
    });
  });

  it('updates existing candidate found by externalId', async () => {
    db.candidateSource.findUnique.mockResolvedValue({
      id: 'src-1',
      name: 'hh.ru',
    });
    const existing = {
      id: 'cand-existing',
      email: 'old@x.com',
      phone: null,
      fullName: 'Alice Old',
    };
    db.candidate.findFirst.mockResolvedValueOnce(existing);
    db.candidate.update.mockResolvedValue(existing);

    const profile = {
      externalId: 'ext-1',
      fullName: 'Alice New',
      email: 'alice@example.com',
      phone: null,
      rawText: 'resume',
      sourceUrl: 'https://hh.ru/1',
      rawPayload: {},
      city: null,
      expectedSalaryUzs: null,
    };

    const adapter = makeAdapter('hh.ru', [profile]);
    const result = await service.ingest('run-1', adapter, {}, 1);

    expect(db.candidate.update).toHaveBeenCalled();
    expect(result).toMatchObject({ fetched: 1, failed: 0 });
  });

  it('stops pagination when hasMore is false', async () => {
    db.candidateSource.findUnique.mockResolvedValue({ id: 'src-1' });
    const adapter = makeAdapter('hh.ru', []);
    adapter.fetchPage.mockResolvedValue({ profiles: [], hasMore: false });

    await service.ingest('run-1', adapter, {}, 5);
    expect(adapter.fetchPage).toHaveBeenCalledTimes(1);
  });

  it('breaks loop on fetchPage error', async () => {
    db.candidateSource.findUnique.mockResolvedValue({ id: 'src-1' });
    const adapter = {
      sourceName: 'hh.ru',
      fetchPage: jest.fn().mockRejectedValue(new Error('timeout')),
    };

    await service.ingest('run-1', adapter, {}, 3);
    expect(adapter.fetchPage).toHaveBeenCalledTimes(1);
    expect(db.ingestionRun.update).toHaveBeenCalled();
  });
});
