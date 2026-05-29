import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsController } from './analytics.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthGuard } from '../../common/guards/auth.guard';

describe('AnalyticsController', () => {
  let controller: AnalyticsController;
  let db: any;

  const companyId = 'company-1';
  const user = { id: 'user-1', companyId, role: 'admin' as const };

  beforeEach(async () => {
    db = {
      application: {
        count: jest.fn(),
        findMany: jest.fn(),
        groupBy: jest.fn(),
      },
      candidate: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [{ provide: PrismaService, useValue: db }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(AnalyticsController);
  });

  // ─── pipeline ────────────────────────────────────────────────────────────

  describe('pipeline()', () => {
    it('returns 10 stage rows', async () => {
      db.application.count.mockResolvedValue(10);

      const result = await controller.pipeline(user);

      expect(result).toHaveLength(10);
    });

    it('rate = Math.round(count/total*100) where total=counts[0]', async () => {
      // 100 at matched, 50 at others
      db.application.count
        .mockResolvedValueOnce(100) // matched
        .mockResolvedValue(50); // rest

      const result = await controller.pipeline(user);

      expect(result[0]).toMatchObject({
        stage: 'matched',
        count: 100,
        rate: 100,
      });
      expect(result[1]).toMatchObject({ rate: 50 });
    });

    it('all counts zero → rates all 0, no divide-by-zero', async () => {
      db.application.count.mockResolvedValue(0);

      const result = await controller.pipeline(user);

      for (const row of result) {
        expect(row.rate).toBe(0);
      }
    });
  });

  // ─── timing ──────────────────────────────────────────────────────────────

  describe('timing()', () => {
    const t = (offsetHours: number) =>
      new Date(Date.now() + offsetHours * 3_600_000);

    it('returns integer hours for valid date pairs', async () => {
      const now = new Date('2026-01-01T10:00:00Z');
      const plus2 = new Date('2026-01-01T12:00:00Z');
      db.application.findMany.mockResolvedValue([
        {
          matchedAt: now,
          outreachSentAt: plus2,
          respondedAt: null,
          screenedAt: null,
          deliveredAt: null,
          interviewedAt: null,
          hiredAt: null,
          rejectedAt: null,
        },
      ]);

      const result = await controller.timing(user);

      expect(result.matchToOutreach).toBe(2);
    });

    it('excludes pair when one date is null', async () => {
      db.application.findMany.mockResolvedValue([
        {
          matchedAt: new Date(),
          outreachSentAt: null,
          respondedAt: null,
          screenedAt: null,
          deliveredAt: null,
          interviewedAt: null,
          hiredAt: null,
          rejectedAt: null,
        },
      ]);

      const result = await controller.timing(user);

      expect(result.matchToOutreach).toBeNull();
    });

    it('excludes negative diffs (data anomalies)', async () => {
      const later = new Date('2026-01-01T12:00:00Z');
      const earlier = new Date('2026-01-01T10:00:00Z');
      db.application.findMany.mockResolvedValue([
        {
          matchedAt: later, // B before A → negative diff
          outreachSentAt: earlier,
          respondedAt: null,
          screenedAt: null,
          deliveredAt: null,
          interviewedAt: null,
          hiredAt: null,
          rejectedAt: null,
        },
      ]);

      const result = await controller.timing(user);

      expect(result.matchToOutreach).toBeNull();
    });

    it('returns null for metric when no valid pairs exist', async () => {
      db.application.findMany.mockResolvedValue([]);

      const result = await controller.timing(user);

      expect(result.matchToOutreach).toBeNull();
      expect(result.interviewToHire).toBeNull();
    });
  });

  // ─── sourcing ────────────────────────────────────────────────────────────

  describe('sourcing()', () => {
    it('counts candidates with no source as "direct"', async () => {
      db.application.groupBy.mockResolvedValue([{ candidateId: 'cand-1' }]);
      db.candidate.findMany.mockResolvedValue([{ source: null }]);

      const result = await controller.sourcing(user);

      expect(result).toContainEqual({ source: 'direct', count: 1 });
    });

    it('tallies multiple candidates from same source', async () => {
      db.application.groupBy.mockResolvedValue([
        { candidateId: 'cand-1' },
        { candidateId: 'cand-2' },
        { candidateId: 'cand-3' },
      ]);
      db.candidate.findMany.mockResolvedValue([
        { source: { name: 'LinkedIn' } },
        { source: { name: 'LinkedIn' } },
        { source: { name: 'HH.ru' } },
      ]);

      const result = await controller.sourcing(user);

      const linkedin = result.find((r: any) => r.source === 'LinkedIn');
      expect(linkedin?.count).toBe(2);
    });

    it('returns results sorted descending by count', async () => {
      db.application.groupBy.mockResolvedValue([
        { candidateId: 'c1' },
        { candidateId: 'c2' },
        { candidateId: 'c3' },
      ]);
      db.candidate.findMany.mockResolvedValue([
        { source: { name: 'A' } },
        { source: { name: 'B' } },
        { source: { name: 'B' } },
      ]);

      const result = await controller.sourcing(user);

      expect(result[0].count).toBeGreaterThanOrEqual(result[1].count);
    });
  });

  // ─── outcomes ────────────────────────────────────────────────────────────

  describe('outcomes()', () => {
    it('monthHired only counts applications hiredAt >= startOfMonth', async () => {
      db.application.count
        .mockResolvedValueOnce(10) // totalHired
        .mockResolvedValueOnce(5) // totalRejected
        .mockResolvedValueOnce(3) // monthHired
        .mockResolvedValueOnce(1); // monthRejected

      const result = await controller.outcomes(user);

      expect(result.totalHired).toBe(10);
      expect(result.monthHired).toBe(3);

      const monthHiredCall = (db.application.count as jest.Mock).mock
        .calls[2][0];
      expect(monthHiredCall.where).toMatchObject({
        status: 'hired',
        hiredAt: { gte: expect.any(Date) },
      });
    });

    it('totalHired has no date constraint', async () => {
      db.application.count.mockResolvedValue(0);

      await controller.outcomes(user);

      const totalHiredCall = (db.application.count as jest.Mock).mock
        .calls[0][0];
      expect(totalHiredCall.where).not.toHaveProperty('hiredAt');
    });
  });
});
