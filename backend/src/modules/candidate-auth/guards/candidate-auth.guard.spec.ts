import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CandidateAuthGuard } from './candidate-auth.guard';

const makeContext = (cookies: Record<string, string> = {}) => ({
  switchToHttp: () => ({
    getRequest: () => ({ cookies }) as any,
  }),
});

describe('CandidateAuthGuard', () => {
  let guard: CandidateAuthGuard;
  let jwtVerify: jest.Mock;

  beforeEach(async () => {
    jwtVerify = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CandidateAuthGuard,
        { provide: JwtService, useValue: { verify: jwtVerify } },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('candidate-secret') },
        },
      ],
    }).compile();

    guard = module.get(CandidateAuthGuard);
  });

  it('throws when c_access_token cookie missing', async () => {
    await expect(guard.canActivate(makeContext() as any)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('throws when JWT verification fails', async () => {
    jwtVerify.mockImplementation(() => {
      throw new Error('invalid');
    });
    await expect(
      guard.canActivate(makeContext({ c_access_token: 'bad' }) as any),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('throws when token type is not candidate_access', async () => {
    jwtVerify.mockReturnValue({ sub: 'cand-1', type: 'staff_access' });
    await expect(
      guard.canActivate(makeContext({ c_access_token: 'tok' }) as any),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('sets request.candidate and returns true on valid token', async () => {
    jwtVerify.mockReturnValue({ sub: 'cand-1', type: 'candidate_access' });
    const req: any = { cookies: { c_access_token: 'valid' } };
    const ctx: any = { switchToHttp: () => ({ getRequest: () => req }) };

    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
    expect(req.candidate).toEqual({ id: 'cand-1' });
  });
});
