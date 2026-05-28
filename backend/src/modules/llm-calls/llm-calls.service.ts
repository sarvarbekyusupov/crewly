import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface LlmCallFilters {
  purpose?: string;
  model?: string;
  companyId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class LlmCallsService {
  constructor(private readonly db: PrismaService) {}

  async findAll(filters: LlmCallFilters = {}) {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, filters.limit ?? 50);
    const skip = (page - 1) * limit;

    const where = {
      ...(filters.purpose && { purpose: filters.purpose }),
      ...(filters.model && { model: filters.model }),
      ...(filters.companyId && { companyId: filters.companyId }),
      ...(filters.from || filters.to
        ? {
            createdAt: {
              ...(filters.from && { gte: new Date(filters.from) }),
              ...(filters.to && { lte: new Date(filters.to) }),
            },
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.db.llmCall.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          purpose: true,
          promptName: true,
          promptVersion: true,
          model: true,
          provider: true,
          companyId: true,
          jobId: true,
          relatedEntityType: true,
          relatedEntityId: true,
          promptTokens: true,
          completionTokens: true,
          totalTokens: true,
          costUsd: true,
          latencyMs: true,
          finishReason: true,
          error: true,
          createdAt: true,
        },
      }),
      this.db.llmCall.count({ where }),
    ]);

    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    return this.db.llmCall.findUnique({ where: { id } });
  }

  async summary() {
    const [byPurpose, byModel, totalCost] = await Promise.all([
      this.db.llmCall.groupBy({
        by: ['purpose'],
        _count: true,
        _sum: { costUsd: true, totalTokens: true },
        orderBy: { _sum: { costUsd: 'desc' } },
      }),
      this.db.llmCall.groupBy({
        by: ['model'],
        _count: true,
        _sum: { costUsd: true, totalTokens: true },
      }),
      this.db.llmCall.aggregate({ _sum: { costUsd: true } }),
    ]);

    return { byPurpose, byModel, totalCostUsd: totalCost._sum.costUsd ?? 0 };
  }
}
