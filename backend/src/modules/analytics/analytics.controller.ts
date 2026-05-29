import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../common/types/auth-user';
import { PrismaService } from '../../prisma/prisma.service';

const STAGES = [
  'matched',
  'outreach_sent',
  'responded',
  'screening',
  'screened_pass',
  'delivered',
  'interview_scheduled',
  'interviewed',
  'offered',
  'hired',
] as const;

type Stage = (typeof STAGES)[number];

@Controller('api/v1/analytics')
@UseGuards(AuthGuard)
export class AnalyticsController {
  constructor(private readonly db: PrismaService) {}

  /**
   * Pipeline funnel: count of applications per status + conversion rates.
   */
  @Get('pipeline')
  async pipeline(@CurrentUser() user: AuthUser, @Query('jobId') jobId?: string) {
    const companyId: string = user.companyId;

    const where = {
      companyId,
      ...(jobId && { jobId }),
    };

    const grouped = await this.db.application.groupBy({
      by: ['status'],
      where,
      _count: { _all: true },
    });

    const countMap = new Map<string, number>(
      grouped.map((g) => [g.status, g._count._all]),
    );

    const total = countMap.get('matched') ?? 1;
    return STAGES.map((stage) => {
      const count = countMap.get(stage) ?? 0;
      return {
        stage,
        count,
        rate: total > 0 ? Math.round((count / total) * 100) : 0,
      };
    });
  }

  /**
   * Avg time (hours) between pipeline stage transitions — computed in the DB.
   */
  @Get('timing')
  async timing(@CurrentUser() user: AuthUser) {
    const companyId: string = user.companyId;

    type TimingRow = {
      matchToOutreach: number | null;
      outreachToResponse: number | null;
      responseToDelivery: number | null;
      deliveryToInterview: number | null;
      interviewToHire: number | null;
    };

    const [row] = await this.db.$queryRaw<TimingRow[]>`
      SELECT
        ROUND(AVG(EXTRACT(EPOCH FROM (outreach_sent_at - matched_at)) / 3600))::int  AS "matchToOutreach",
        ROUND(AVG(EXTRACT(EPOCH FROM (responded_at   - outreach_sent_at)) / 3600))::int AS "outreachToResponse",
        ROUND(AVG(EXTRACT(EPOCH FROM (delivered_at   - responded_at)) / 3600))::int     AS "responseToDelivery",
        ROUND(AVG(EXTRACT(EPOCH FROM (interviewed_at - delivered_at)) / 3600))::int     AS "deliveryToInterview",
        ROUND(AVG(EXTRACT(EPOCH FROM (hired_at       - interviewed_at)) / 3600))::int   AS "interviewToHire"
      FROM applications
      WHERE company_id = ${companyId}
        AND outreach_sent_at > matched_at
        AND (responded_at IS NULL   OR responded_at   > outreach_sent_at)
        AND (delivered_at IS NULL   OR delivered_at   > responded_at)
        AND (interviewed_at IS NULL OR interviewed_at > delivered_at)
        AND (hired_at IS NULL       OR hired_at       > interviewed_at)
    `;

    return {
      matchToOutreach: row?.matchToOutreach ?? null,
      outreachToResponse: row?.outreachToResponse ?? null,
      responseToDelivery: row?.responseToDelivery ?? null,
      deliveryToInterview: row?.deliveryToInterview ?? null,
      interviewToHire: row?.interviewToHire ?? null,
    };
  }

  /**
   * Candidates sourced per CandidateSource name.
   */
  @Get('sourcing')
  async sourcing(@CurrentUser() user: AuthUser) {
    const companyId: string = user.companyId;

    const rows = await this.db.application.groupBy({
      by: ['candidateId'],
      where: { companyId },
    });

    const candidateIds = rows.map((r) => r.candidateId);

    const candidates = await this.db.candidate.findMany({
      where: { id: { in: candidateIds } },
      select: { source: { select: { name: true } } },
    });

    const tally: Record<string, number> = {};
    for (const c of candidates) {
      const name = c.source?.name ?? 'direct';
      tally[name] = (tally[name] ?? 0) + 1;
    }

    return Object.entries(tally)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Hired vs rejected this month + running totals.
   */
  @Get('outcomes')
  async outcomes(@CurrentUser() user: AuthUser) {
    const companyId: string = user.companyId;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalHired, totalRejected, monthHired, monthRejected] =
      await Promise.all([
        this.db.application.count({ where: { companyId, status: 'hired' } }),
        this.db.application.count({
          where: { companyId, status: 'rejected_by_client' },
        }),
        this.db.application.count({
          where: { companyId, status: 'hired', hiredAt: { gte: startOfMonth } },
        }),
        this.db.application.count({
          where: {
            companyId,
            status: 'rejected_by_client',
            rejectedAt: { gte: startOfMonth },
          },
        }),
      ]);

    return { totalHired, totalRejected, monthHired, monthRejected };
  }

  /**
   * Agent performance and activity.
   */
  @Get('agents')
  async agents(@CurrentUser() user: AuthUser) {
    const companyId: string = user.companyId;

    const stats = await this.db.llmCall.groupBy({
      by: ['agentName'],
      where: { companyId },
      _count: { _all: true },
      _sum: { costUsd: true },
    });

    const recentCalls = await this.db.llmCall.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      take: 15,
      select: {
        id: true,
        agentName: true,
        purpose: true,
        model: true,
        costUsd: true,
        createdAt: true,
        relatedEntityType: true,
        relatedEntityId: true,
      },
    });

    return {
      stats: stats.map((s) => ({
        agent: s.agentName || 'System',
        count: s._count._all,
        totalCost: Number(s._sum.costUsd || 0),
      })),
      recent: recentCalls.map((c) => ({
        id: c.id,
        agent: c.agentName || 'System',
        purpose: c.purpose,
        cost: Number(c.costUsd || 0),
        at: c.createdAt,
        entityType: c.relatedEntityType,
        entityId: c.relatedEntityId,
      })),
    };
  }
}
