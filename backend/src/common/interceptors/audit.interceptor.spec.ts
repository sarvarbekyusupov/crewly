import { Test, TestingModule } from '@nestjs/testing';
import { of } from 'rxjs';
import { AuditInterceptor } from './audit.interceptor';
import { PrismaService } from '../../prisma/prisma.service';

const makeContext = (
  method: string,
  path: string,
  user?: any,
  ip = '127.0.0.1',
) => ({
  switchToHttp: () => ({
    getRequest: () => ({ method, path, user, ip }),
  }),
});

const makeHandler = () => ({ handle: () => of('response') });

describe('AuditInterceptor', () => {
  let interceptor: AuditInterceptor;
  let db: { auditLog: { create: jest.Mock } };

  beforeEach(async () => {
    db = { auditLog: { create: jest.fn().mockResolvedValue({}) } };

    const module: TestingModule = await Test.createTestingModule({
      providers: [AuditInterceptor, { provide: PrismaService, useValue: db }],
    }).compile();

    interceptor = module.get(AuditInterceptor);
  });

  it('creates audit log for GET /candidates/:id with authenticated user', (done) => {
    const ctx = makeContext('GET', '/api/v1/candidates/cand-1', {
      id: 'user-1',
      companyId: 'co-1',
    });
    interceptor.intercept(ctx as any, makeHandler() as any).subscribe(() => {
      expect(db.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'candidate.view',
            resourceId: 'cand-1',
            actorId: 'user-1',
          }),
        }),
      );
      done();
    });
  });

  it('skips audit log for non-GET requests', (done) => {
    const ctx = makeContext('POST', '/api/v1/candidates/cand-1', {
      id: 'user-1',
      companyId: 'co-1',
    });
    interceptor.intercept(ctx as any, makeHandler() as any).subscribe(() => {
      expect(db.auditLog.create).not.toHaveBeenCalled();
      done();
    });
  });

  it('skips audit log when no user', (done) => {
    const ctx = makeContext('GET', '/api/v1/candidates/cand-1', undefined);
    interceptor.intercept(ctx as any, makeHandler() as any).subscribe(() => {
      expect(db.auditLog.create).not.toHaveBeenCalled();
      done();
    });
  });

  it('skips audit log for non-candidate paths', (done) => {
    const ctx = makeContext('GET', '/api/v1/jobs/job-1', {
      id: 'user-1',
      companyId: 'co-1',
    });
    interceptor.intercept(ctx as any, makeHandler() as any).subscribe(() => {
      expect(db.auditLog.create).not.toHaveBeenCalled();
      done();
    });
  });

  it('passes response through', (done) => {
    const ctx = makeContext('GET', '/api/v1/jobs', {
      id: 'user-1',
      companyId: 'co-1',
    });
    interceptor.intercept(ctx as any, makeHandler() as any).subscribe((val) => {
      expect(val).toBe('response');
      done();
    });
  });
});
