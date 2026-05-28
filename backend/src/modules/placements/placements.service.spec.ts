import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PlacementsService } from './placements.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('PlacementsService', () => {
  let service: PlacementsService;
  let db: any;

  const companyId = 'company-1';
  const placementId = 'placement-1';
  const candidateId = 'candidate-1';

  beforeEach(async () => {
    db = {
      placement: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      candidate: {
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [PlacementsService, { provide: PrismaService, useValue: db }],
    }).compile();

    service = module.get(PlacementsService);
  });

  describe('findAll', () => {
    it('returns paginated placements with relations', async () => {
      db.placement.findMany.mockResolvedValue([{ id: placementId }]);
      db.placement.count.mockResolvedValue(1);

      const result = await service.findAll(companyId);
      expect(result).toEqual({
        data: [{ id: placementId }],
        total: 1,
        page: 1,
        limit: 20,
      });
    });
  });

  describe('findOne', () => {
    it('returns placement when found', async () => {
      const placement = { id: placementId, companyId, candidateId };
      db.placement.findFirst.mockResolvedValue(placement);

      const result = await service.findOne(companyId, placementId);
      expect(result).toEqual(placement);
    });

    it('throws NotFoundException when placement not found', async () => {
      db.placement.findFirst.mockResolvedValue(null);
      await expect(service.findOne(companyId, placementId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when placement belongs to another company', async () => {
      db.placement.findFirst.mockResolvedValue(null);
      await expect(
        service.findOne('other-company', placementId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('recordSeparation', () => {
    const guaranteeExpiry = new Date('2026-06-01');

    it('sets replacementRequired=true when separation within guarantee period', async () => {
      db.placement.findFirst.mockResolvedValue({
        id: placementId,
        companyId,
        candidateId,
        guaranteeExpiresAt: guaranteeExpiry,
      });
      db.placement.update.mockResolvedValue({});
      db.candidate.update.mockResolvedValue({});

      const result = await service.recordSeparation(companyId, placementId, {
        separationDate: '2026-05-01',
      });

      expect(result.withinGuarantee).toBe(true);
      expect(result.replacementRequired).toBe(true);
      expect(db.placement.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ replacementRequired: true }),
        }),
      );
    });

    it('sets replacementRequired=false when separation after guarantee period', async () => {
      db.placement.findFirst.mockResolvedValue({
        id: placementId,
        companyId,
        candidateId,
        guaranteeExpiresAt: guaranteeExpiry,
      });
      db.placement.update.mockResolvedValue({});
      db.candidate.update.mockResolvedValue({});

      const result = await service.recordSeparation(companyId, placementId, {
        separationDate: '2026-07-01',
      });

      expect(result.withinGuarantee).toBe(false);
      expect(result.replacementRequired).toBe(false);
    });

    it('respects explicit replacementRequired override', async () => {
      db.placement.findFirst.mockResolvedValue({
        id: placementId,
        companyId,
        candidateId,
        guaranteeExpiresAt: guaranteeExpiry,
      });
      db.placement.update.mockResolvedValue({});
      db.candidate.update.mockResolvedValue({});

      const result = await service.recordSeparation(companyId, placementId, {
        separationDate: '2026-05-01',
        replacementRequired: false,
      });

      expect(result.replacementRequired).toBe(false);
    });

    it('updates candidate.lastActiveAt', async () => {
      db.placement.findFirst.mockResolvedValue({
        id: placementId,
        companyId,
        candidateId,
        guaranteeExpiresAt: null,
      });
      db.placement.update.mockResolvedValue({});
      db.candidate.update.mockResolvedValue({});

      await service.recordSeparation(companyId, placementId, {
        separationDate: '2026-05-01',
      });

      expect(db.candidate.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: candidateId },
          data: expect.objectContaining({ lastActiveAt: expect.any(Date) }),
        }),
      );
    });
  });
});
