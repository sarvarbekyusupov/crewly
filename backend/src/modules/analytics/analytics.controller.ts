import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('api/v1/analytics')
@UseGuards(AuthGuard)
export class AnalyticsController {
  constructor(private readonly db: PrismaService) {}

  /**
   * Pipeline funnel: count of applications per status + conversion rates.
   */
  @Get('pipeline')
  async pipeline(@CurrentUser() user: any, @Query('jobId') jobId?: string) {
    const companyId: string = user.companyId;

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

    const where = {
      companyId,
      ...(jobId && { jobId }),
    };

    const counts = await Promise.all(
      STAGES.map((status) =>
        this.db.application.count({ where: { ...where, status } }),
      ),
    );

    const total = counts[0] ?? 1;
    return STAGES.map((stage, i) => ({
      stage,
      count: counts[i],
      rate: total > 0 ? Math.round((counts[i] / total) * 100) : 0,
    }));
  }

  /**
   * Avg time (hours) between pipeline stage transitions.
   */
  @Get('timing')
  async timing(@CurrentUser() user: any) {
    const companyId: string = user.companyId;

    const apps = await this.db.application.findMany({
      where: { companyId },
      select: {
        matchedAt: true,
        outreachSentAt: true,
        respondedAt: true,
        screenedAt: true,
        deliveredAt: true,
        interviewedAt: true,
        hiredAt: true,
        rejectedAt: true,
      },
    });

    const avgHours = (
      getA: (a: (typeof apps)[0]) => Date | null,
      getB: (a: (typeof apps)[0]) => Date | null,
    ) => {
      const diffs = apps
        .map((a) => {
          const a1 = getA(a);
          const b1 = getB(a);
          if (!a1 || !b1) return null;
          return (b1.getTime() - a1.getTime()) / 3_600_000;
        })
        .filter((d): d is number => d !== null && d > 0);
      if (!diffs.length) return null;
      return Math.round(diffs.reduce((s, v) => s + v, 0) / diffs.length);
    };

    return {
      matchToOutreach: avgHours(
        (a) => a.matchedAt,
        (a) => a.outreachSentAt,
      ),
      outreachToResponse: avgHours(
        (a) => a.outreachSentAt,
        (a) => a.respondedAt,
      ),
      responseToDelivery: avgHours(
        (a) => a.respondedAt,
        (a) => a.deliveredAt,
      ),
      deliveryToInterview: avgHours(
        (a) => a.deliveredAt,
        (a) => a.interviewedAt,
      ),
      interviewToHire: avgHours(
        (a) => a.interviewedAt,
        (a) => a.hiredAt,
      ),
    };
  }

  /**
   * Candidates sourced per CandidateSource name.
   */
  @Get('sourcing')
  async sourcing(@CurrentUser() user: any) {
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
  async outcomes(@CurrentUser() user: any) {
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
  async agents(@CurrentUser() user: any) {
    const companyId: string = user.companyId;

    // Get aggregated stats per agent
    const stats = await this.db.llmCall.groupBy({
      by: ['agentName'],
      where: { companyId },
      _count: { _all: true },
      _sum: { costUsd: true },
    });

    // Get 15 most recent activities across all agents for this company
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
