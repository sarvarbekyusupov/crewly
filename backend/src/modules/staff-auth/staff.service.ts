import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { hashToken, generateRawToken } from '../../common/utils/token.utils';
import { DUMMY_HASH } from '../../common/auth.constants';
import * as argon2 from 'argon2';

const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

@Injectable()
export class StaffService {
  constructor(private readonly db: PrismaService) {}

  async login(
    email: string,
    password: string,
  ): Promise<{
    token: string;
    staff: { id: string; email: string; role: string };
  }> {
    const staff = await this.db.staff.findUnique({ where: { email } });
    const hashToVerify = staff?.passwordHash ?? DUMMY_HASH;
    const valid = await argon2
      .verify(hashToVerify, password)
      .catch(() => false);
    if (!staff || !valid)
      throw new UnauthorizedException('Invalid credentials');

    const token = generateRawToken();
    const tokenHash = hashToken(token);
    await this.db.staffSession.create({
      data: {
        staffId: staff.id,
        tokenHash,
        expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      },
    });

    return {
      token,
      staff: { id: staff.id, email: staff.email, role: staff.role },
    };
  }

  async refresh(rawToken: string): Promise<string> {
    const tokenHash = hashToken(rawToken);
    const session = await this.db.staffSession.findUnique({
      where: { tokenHash },
    });

    if (!session || session.expiresAt <= new Date()) {
      if (session) {
        this.db.staffSession
          .delete({ where: { id: session.id } })
          .catch(() => {});
      }
      throw new UnauthorizedException('Session expired');
    }

    const newRawToken = generateRawToken();
    const newTokenHash = hashToken(newRawToken);

    await this.db.$transaction([
      this.db.staffSession.delete({ where: { id: session.id } }),
      this.db.staffSession.create({
        data: {
          staffId: session.staffId,
          tokenHash: newTokenHash,
          expiresAt: new Date(Date.now() + SESSION_TTL_MS),
        },
      }),
    ]);

    return newRawToken;
  }

  async logout(rawToken: string): Promise<void> {
    const tokenHash = hashToken(rawToken);
    await this.db.staffSession.deleteMany({ where: { tokenHash } });
  }

  async logoutAll(staffId: string): Promise<void> {
    await this.db.staffSession.deleteMany({ where: { staffId } });
  }

  async getDashboard() {
    const [
      totalCompanies,
      totalCandidates,
      totalJobs,
      totalApplications,
      llmCostToday,
    ] = await Promise.all([
      this.db.company.count({ where: { deletedAt: null } }),
      this.db.candidate.count({ where: { deletedAt: null } }),
      this.db.job.count({ where: { deletedAt: null, status: 'active' } }),
      this.db.application.count({
        where: { status: { in: ['outreach_sent', 'screening', 'delivered'] } },
      }),
      this.db.llmCall.aggregate({
        _sum: { costUsd: true },
        where: {
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
    ]);

    return {
      totalCompanies,
      totalCandidates,
      activeJobs: totalJobs,
      activeApplications: totalApplications,
      llmCostTodayUsd: llmCostToday._sum.costUsd ?? 0,
    };
  }

  async getCompanies(page: number, limit: number) {
    const skip = (page - 1) * limit;
    const where = { deletedAt: null };
    const [data, total] = await Promise.all([
      this.db.company.findMany({
        where,
        include: { _count: { select: { users: true, jobs: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.db.company.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async getLlmCosts() {
    return this.db.llmCall.groupBy({
      by: ['purpose', 'model'],
      _sum: { costUsd: true, totalTokens: true },
      _count: true,
      orderBy: { _sum: { costUsd: 'desc' } },
    });
  }

  async getIngestionRuns() {
    return this.db.ingestionRun.findMany({
      include: { source: { select: { name: true } } },
      orderBy: { startedAt: 'desc' },
      take: 50,
    });
  }

  async getJobDiscoveryRuns() {
    return this.db.jobDiscoveryRun.findMany({
      orderBy: { startedAt: 'desc' },
      take: 50,
    });
  }

  async getAuditLogs(page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.db.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.db.auditLog.count(),
    ]);
    return {
      data: data.map((d) => ({ ...d, id: d.id.toString() })),
      total,
      page,
      limit,
    };
  }
}
