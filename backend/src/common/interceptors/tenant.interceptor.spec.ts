import { Test, TestingModule } from '@nestjs/testing';
import { of } from 'rxjs';
import { TenantInterceptor } from './tenant.interceptor';
import { PrismaService } from '../../prisma/prisma.service';

const makeContext = (user?: any) => ({
  switchToHttp: () => ({
    getRequest: () => ({ user }),
  }),
});

const makeHandler = (value = 'data') => ({ handle: () => of(value) });

describe('TenantInterceptor', () => {
  let interceptor: TenantInterceptor;
  let prisma: { runInTenantContext: jest.Mock };

  beforeEach(async () => {
    prisma = {
      runInTenantContext: jest.fn((companyId: string, fn: () => Promise<any>) =>
        fn(),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantInterceptor,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    interceptor = module.get(TenantInterceptor);
  });

  it('passes through directly when no user', (done) => {
    const ctx = makeContext(undefined);
    interceptor.intercept(ctx as any, makeHandler() as any).subscribe((val) => {
      expect(val).toBe('data');
      expect(prisma.runInTenantContext).not.toHaveBeenCalled();
      done();
    });
  });

  it('passes through when user has no companyId', (done) => {
    const ctx = makeContext({ id: 'u-1' });
    interceptor.intercept(ctx as any, makeHandler() as any).subscribe((val) => {
      expect(val).toBe('data');
      expect(prisma.runInTenantContext).not.toHaveBeenCalled();
      done();
    });
  });

  it('runs in tenant context when user has companyId', (done) => {
    const ctx = makeContext({ companyId: 'co-1' });
    interceptor
      .intercept(ctx as any, makeHandler('tenant-data') as any)
      .subscribe((val) => {
        expect(val).toBe('tenant-data');
        expect(prisma.runInTenantContext).toHaveBeenCalledWith(
          'co-1',
          expect.any(Function),
        );
        done();
      });
  });
});
