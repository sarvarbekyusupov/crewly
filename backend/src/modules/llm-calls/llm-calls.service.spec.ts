import { Test, TestingModule } from '@nestjs/testing';
import { LlmCallsService } from './llm-calls.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('LlmCallsService', () => {
  let service: LlmCallsService;
  let db: any;

  beforeEach(async () => {
    db = {
      llmCall: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        findUnique: jest.fn(),
        groupBy: jest.fn().mockResolvedValue([]),
        aggregate: jest.fn().mockResolvedValue({ _sum: { costUsd: null } }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [LlmCallsService, { provide: PrismaService, useValue: db }],
    }).compile();

    service = module.get(LlmCallsService);
  });

  describe('findAll', () => {
    it('returns paginated results with default page/limit', async () => {
      db.llmCall.findMany.mockResolvedValue([{ id: 'lc-1' }]);
      db.llmCall.count.mockResolvedValue(1);

      const result = await service.findAll();
      expect(result).toMatchObject({
        data: [{ id: 'lc-1' }],
        total: 1,
        page: 1,
        limit: 50,
        pages: 1,
      });
    });

    it('applies filters: purpose, model, companyId, date range', async () => {
      await service.findAll({
        purpose: 'parse',
        model: 'gpt-4',
        companyId: 'co-1',
        from: '2025-01-01',
        to: '2025-12-31',
        page: 2,
        limit: 10,
      });
      expect(db.llmCall.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            purpose: 'parse',
            model: 'gpt-4',
            companyId: 'co-1',
            createdAt: expect.any(Object),
          }),
          skip: 10,
          take: 10,
        }),
      );
    });

    it('caps limit at 100', async () => {
      await service.findAll({ limit: 500 });
      expect(db.llmCall.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 }),
      );
    });
  });

  describe('findOne', () => {
    it('returns llm call by id', async () => {
      db.llmCall.findUnique.mockResolvedValue({ id: 'lc-1' });
      const result = await service.findOne('lc-1');
      expect(result).toEqual({ id: 'lc-1' });
    });
  });

  describe('summary', () => {
    it('returns summary with zero cost when null', async () => {
      const result = await service.summary();
      expect(result).toMatchObject({
        byPurpose: [],
        byModel: [],
        totalCostUsd: 0,
      });
    });

    it('returns actual total cost', async () => {
      db.llmCall.aggregate.mockResolvedValue({ _sum: { costUsd: 42.5 } });
      const result = await service.summary();
      expect(result.totalCostUsd).toBe(42.5);
    });
  });
});
