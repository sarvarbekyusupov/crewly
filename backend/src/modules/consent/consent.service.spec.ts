import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConsentService } from './consent.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('ConsentService', () => {
  let service: ConsentService;
  let db: any;

  beforeEach(async () => {
    db = {
      application: { findFirst: jest.fn() },
      consentRecord: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ConsentService, { provide: PrismaService, useValue: db }],
    }).compile();

    service = module.get(ConsentService);
  });

  describe('findForCandidate', () => {
    it('throws NotFoundException when candidate not in pipeline', async () => {
      db.application.findFirst.mockResolvedValue(null);
      await expect(service.findForCandidate('co-1', 'cand-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns consent records when candidate in pipeline', async () => {
      db.application.findFirst.mockResolvedValue({ id: 'app-1' });
      db.consentRecord.findMany.mockResolvedValue([
        { id: 'cr-1', action: 'given' },
      ]);
      const result = await service.findForCandidate('co-1', 'cand-1');
      expect(result).toEqual([{ id: 'cr-1', action: 'given' }]);
    });
  });

  describe('findAllForStaff', () => {
    it('returns paginated consent records without filter', async () => {
      db.consentRecord.findMany.mockResolvedValue([{ id: 'cr-1' }]);
      db.consentRecord.count.mockResolvedValue(1);
      const result = await service.findAllForStaff();
      expect(result).toMatchObject({
        data: [{ id: 'cr-1' }],
        total: 1,
        page: 1,
        limit: 50,
      });
    });

    it('filters by candidateId when provided', async () => {
      db.consentRecord.findMany.mockResolvedValue([]);
      await service.findAllForStaff('cand-1');
      expect(db.consentRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { candidateId: 'cand-1' } }),
      );
    });
  });
});
