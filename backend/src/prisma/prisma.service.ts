import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AsyncLocalStorage } from 'async_hooks';

export interface TenantContext {
  companyId: string;
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  static readonly tenantContext = new AsyncLocalStorage<TenantContext>();

  // Models auto-filtered by companyId in tenant context (set by TenantInterceptor).
  // Intentionally limited to core company-owned records. Models NOT listed here
  // (Candidate, Conversation, Screening, OutreachAttempt) have no cross-company
  // risk because they are accessed only via an Application which IS filtered.
  // If you add a model that can be queried directly without going through an
  // Application, add it here.
  private static readonly TENANT_TABLES = new Set([
    'Job',
    'Application',
    'Placement',
    'Invoice',
    'LlmCall',
    'AuditLog',
  ]);

  constructor() {
    super({
      log:
        process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });

    this.$use(async (params, next) => {
      const ctx = PrismaService.tenantContext.getStore();
      if (!ctx || !params.model) return next(params);

      if (!PrismaService.TENANT_TABLES.has(params.model)) return next(params);

      const { action, args } = params;

      if (
        action === 'findMany' ||
        action === 'findFirst' ||
        action === 'count' ||
        action === 'aggregate'
      ) {
        params.args = {
          ...args,
          where: { ...args?.where, companyId: ctx.companyId },
        };
      }

      if (action === 'findUnique') {
        params.action = 'findFirst';
        params.args = {
          ...args,
          where: { ...args?.where, companyId: ctx.companyId },
        };
      }

      if (action === 'create') {
        params.args = {
          ...args,
          data: { ...args?.data, companyId: ctx.companyId },
        };
      }

      if (action === 'update' || action === 'delete') {
        params.args = {
          ...args,
          where: { ...args?.where, companyId: ctx.companyId },
        };
      }

      return next(params);
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  runInTenantContext<T>(companyId: string, fn: () => Promise<T>): Promise<T> {
    return PrismaService.tenantContext.run({ companyId }, fn);
  }
}
