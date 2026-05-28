import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from './auth.guard';

function makeContext(overrides: {
  cookie?: string;
  isPublic?: boolean;
}): ExecutionContext {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(overrides.isPublic ?? false),
  } as any;

  const request = { cookies: {} as Record<string, string> };
  if (overrides.cookie !== undefined) {
    request.cookies['hr_access_token'] = overrides.cookie;
  }

  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({ getRequest: () => request }),
    _reflector: reflector,
    _request: request,
  } as any;
}

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let reflector: { getAllAndOverride: jest.Mock };
  let jwt: { verify: jest.Mock };
  let config: { get: jest.Mock };

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    jwt = { verify: jest.fn() };
    config = { get: jest.fn().mockReturnValue('test-secret') };
    guard = new AuthGuard(reflector as any, jwt as any, config as any);
  });

  it('allows public routes without token', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);

    const ctx = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: () => ({ cookies: {} }) }),
    } as any;

    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });

  it('throws UnauthorizedException when no cookie', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);

    const ctx = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: () => ({ cookies: {} }) }),
    } as any;

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when JWT invalid', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    jwt.verify.mockImplementation(() => {
      throw new Error('invalid');
    });

    const ctx = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ cookies: { hr_access_token: 'bad-token' } }),
      }),
    } as any;

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when token type is not access', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    jwt.verify.mockReturnValue({
      sub: 'u1',
      type: 'refresh',
      companyId: 'c1',
      role: 'owner',
    });

    const request = { cookies: { hr_access_token: 'token' } } as any;
    const ctx = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: () => request }),
    } as any;

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('sets request.user and returns true for valid access token', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    jwt.verify.mockReturnValue({
      sub: 'u1',
      type: 'access',
      companyId: 'c1',
      role: 'admin',
    });

    const request = { cookies: { hr_access_token: 'valid-token' } } as any;
    const ctx = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: () => request }),
    } as any;

    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
    expect(request.user).toEqual({ id: 'u1', companyId: 'c1', role: 'admin' });
  });
});
