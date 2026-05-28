import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { ScreeningsService } from './screenings.service';
import { PrismaService } from '../../prisma/prisma.service';
import { QUEUES } from '../../workers/queue-names';

describe('ScreeningsService', () => {
  let service: ScreeningsService;
  let db: any;
  let screeningQueue: { add: jest.Mock };

  const companyId = 'company-1';
  const applicationId = 'app-1';
  const screeningId = 'screening-1';
  const candidateId = 'candidate-1';

  beforeEach(async () => {
    db = {
      application: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      screening: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      conversation: {
        create: jest.fn(),
      },
    };
    screeningQueue = { add: jest.fn().mockResolvedValue({}) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScreeningsService,
        { provide: PrismaService, useValue: db },
        {
          provide: getQueueToken(QUEUES.ADVANCE_SCREENING),
          useValue: screeningQueue,
        },
      ],
    }).compile();

    service = module.get(ScreeningsService);
  });

  describe('findByApplication', () => {
    it('throws NotFoundException when application not found', async () => {
      db.application.findFirst.mockResolvedValue(null);
      await expect(
        service.findByApplication(applicationId, companyId),
      ).rejects.toThrow(NotFoundException);
    });

    it('returns screenings for application', async () => {
      db.application.findFirst.mockResolvedValue({ id: applicationId });
      db.screening.findMany.mockResolvedValue([{ id: screeningId }]);

      const result = await service.findByApplication(applicationId, companyId);
      expect(result).toEqual([{ id: screeningId }]);
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when screening not found', async () => {
      db.screening.findUnique.mockResolvedValue(null);
      await expect(service.findOne(screeningId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when companyId mismatch', async () => {
      db.screening.findUnique.mockResolvedValue({
        id: screeningId,
        application: { companyId: 'other-company' },
        conversation: null,
      });
      await expect(service.findOne(screeningId, companyId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns screening when companyId matches', async () => {
      const screening = {
        id: screeningId,
        application: { companyId },
        conversation: { messages: [] },
      };
      db.screening.findUnique.mockResolvedValue(screening);

      const result = await service.findOne(screeningId, companyId);
      expect(result).toEqual(screening);
    });

    it('returns screening without companyId check when companyId not provided', async () => {
      const screening = {
        id: screeningId,
        application: { companyId },
        conversation: null,
      };
      db.screening.findUnique.mockResolvedValue(screening);

      const result = await service.findOne(screeningId);
      expect(result).toEqual(screening);
    });
  });

  describe('create', () => {
    it('throws NotFoundException when application not found', async () => {
      db.application.findFirst.mockResolvedValue(null);
      await expect(service.create(applicationId, companyId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('creates conversation, screening, updates app status, enqueues job', async () => {
      db.application.findFirst.mockResolvedValue({
        id: applicationId,
        candidateId,
      });
      db.conversation.create.mockResolvedValue({ id: 'conv-1' });
      db.screening.create.mockResolvedValue({ id: screeningId });
      db.application.update.mockResolvedValue({});

      const result = await service.create(applicationId, companyId);

      expect(db.conversation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            applicationId,
            candidateId,
            channel: 'internal',
          }),
        }),
      );
      expect(db.screening.create).toHaveBeenCalled();
      expect(db.application.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'screening' } }),
      );
      expect(screeningQueue.add).toHaveBeenCalledWith(
        { screeningId },
        expect.any(Object),
      );
      expect(result).toEqual({ id: screeningId });
    });
  });

  describe('escalate', () => {
    it('updates screening to escalated status', async () => {
      db.screening.findUnique.mockResolvedValue({
        id: screeningId,
        application: { companyId },
        conversation: null,
      });
      db.screening.update.mockResolvedValue({
        id: screeningId,
        status: 'escalated',
      });

      await service.escalate(
        screeningId,
        companyId,
        'candidate not responding',
      );

      expect(db.screening.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: screeningId },
          data: expect.objectContaining({
            status: 'escalated',
            escalationReason: 'candidate not responding',
          }),
        }),
      );
    });
  });
});
