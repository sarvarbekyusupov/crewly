import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CompanyRoleGuard } from './company-role.guard';

function makeCtx(
  requiredRoles: string[] | null,
  userRole: string | null,
): ExecutionContext {
  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({ user: userRole ? { role: userRole } : null }),
    }),
  } as any;
}

describe('CompanyRoleGuard', () => {
  let guard: CompanyRoleGuard;
  let reflector: { getAllAndOverride: jest.Mock };

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new CompanyRoleGuard(reflector as unknown as Reflector);
  });

  it('allows access when no roles required', () => {
    reflector.getAllAndOverride.mockReturnValue(null);
    const ctx = makeCtx(null, 'viewer');
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows owner on owner-required route', () => {
    reflector.getAllAndOverride.mockReturnValue(['owner']);
    const ctx = makeCtx(['owner'], 'owner');
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows owner on admin-required route (higher rank)', () => {
    reflector.getAllAndOverride.mockReturnValue(['admin']);
    const ctx = makeCtx(['admin'], 'owner');
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows admin on hiring_manager-required route', () => {
    reflector.getAllAndOverride.mockReturnValue(['hiring_manager']);
    const ctx = makeCtx(['hiring_manager'], 'admin');
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('throws ForbiddenException when viewer tries admin route', () => {
    reflector.getAllAndOverride.mockReturnValue(['admin']);
    const ctx = makeCtx(['admin'], 'viewer');
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when hiring_manager tries admin route', () => {
    reflector.getAllAndOverride.mockReturnValue(['admin']);
    const ctx = makeCtx(['admin'], 'hiring_manager');
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when no user on request', () => {
    reflector.getAllAndOverride.mockReturnValue(['hiring_manager']);
    const ctx = makeCtx(['hiring_manager'], null);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });
});
