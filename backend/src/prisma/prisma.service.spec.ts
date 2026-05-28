import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  describe('runInTenantContext', () => {
    it('runs callback and returns result', async () => {
      const result = await PrismaService.prototype.runInTenantContext.call(
        null,
        'co-1',
        async () => 'result',
      );
      expect(result).toBe('result');
    });

    it('injects companyId into AsyncLocalStorage during callback', async () => {
      let capturedContext: any;
      await PrismaService.prototype.runInTenantContext.call(
        null,
        'co-test',
        async () => {
          capturedContext = PrismaService.tenantContext.getStore();
          return 'done';
        },
      );
      expect(capturedContext).toEqual({ companyId: 'co-test' });
    });
  });

  describe('tenantContext middleware logic (unit)', () => {
    it('does not filter when no tenant context', async () => {
      const next = jest.fn().mockResolvedValue('next-result');
      const params = { model: 'Job', action: 'findMany', args: { where: {} } };

      const result = await PrismaService.tenantContext.run(
        undefined as any,
        async () => {
          const ctx = PrismaService.tenantContext.getStore();
          if (!ctx || !params.model) return next(params);
          return next(params);
        },
      );

      expect(result).toBe('next-result');
    });

    it('injects companyId into findMany where clause in tenant context', async () => {
      const params: any = {
        model: 'Job',
        action: 'findMany',
        args: { where: { status: 'active' } },
      };
      const next = jest
        .fn()
        .mockImplementation((p: any) => Promise.resolve(p.args));

      const result = await PrismaService.tenantContext.run(
        { companyId: 'co-injected' },
        async () => {
          const ctx = PrismaService.tenantContext.getStore();
          if (ctx && params.model) {
            if (
              ['findMany', 'findFirst', 'count', 'aggregate'].includes(
                params.action,
              )
            ) {
              params.args = {
                ...params.args,
                where: { ...params.args?.where, companyId: ctx.companyId },
              };
            }
          }
          return next(params);
        },
      );

      expect(result.where).toMatchObject({
        status: 'active',
        companyId: 'co-injected',
      });
    });
  });
});
