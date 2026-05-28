import { ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { TenantScopeInterceptor } from './tenant-scope.interceptor';
import { PrismaService } from '../../prisma/prisma.service';

function makeContext(user: any): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as any;
}

function makeNext(value: any = { data: 'result' }): CallHandler {
  return { handle: () => of(value) };
}

describe('TenantScopeInterceptor', () => {
  let interceptor: TenantScopeInterceptor;
  let runSpy: jest.SpyInstance;

  beforeEach(() => {
    interceptor = new TenantScopeInterceptor();
    runSpy = jest
      .spyOn(PrismaService.tenantContext, 'run')
      .mockImplementation((_store: any, cb: () => void) => cb());
  });

  afterEach(() => {
    runSpy.mockRestore();
  });

  it('passes through when no user', (done) => {
    const ctx = makeContext(undefined);
    const next = makeNext();
    const result = interceptor.intercept(ctx, next);
    expect(result).toBeInstanceOf(Observable);
    result.subscribe({
      next: (val) => {
        expect(val).toEqual({ data: 'result' });
        expect(runSpy).not.toHaveBeenCalled();
        done();
      },
    });
  });

  it('passes through when user has no companyId', (done) => {
    const ctx = makeContext({ id: 'user-1' });
    const next = makeNext();
    const result = interceptor.intercept(ctx, next);
    result.subscribe({
      next: (val) => {
        expect(val).toEqual({ data: 'result' });
        expect(runSpy).not.toHaveBeenCalled();
        done();
      },
    });
  });

  it('runs in tenant context when companyId present', (done) => {
    const ctx = makeContext({ id: 'user-1', companyId: 'company-42' });
    const next = makeNext('response');
    const result = interceptor.intercept(ctx, next);
    expect(result).toBeInstanceOf(Observable);
    result.subscribe({
      next: (val) => {
        expect(val).toBe('response');
        expect(runSpy).toHaveBeenCalledWith(
          { companyId: 'company-42' },
          expect.any(Function),
        );
        done();
      },
    });
  });

  it('propagates errors through tenant context', (done) => {
    const ctx = makeContext({ companyId: 'c-1' });
    const errorNext: CallHandler = {
      handle: () =>
        new Observable((obs) => obs.error(new Error('inner error'))),
    };
    const result = interceptor.intercept(ctx, errorNext);
    result.subscribe({
      error: (err) => {
        expect(err.message).toBe('inner error');
        done();
      },
    });
  });
});
