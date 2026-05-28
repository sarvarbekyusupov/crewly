import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { StaffGuard } from './staff.guard';
import { PrismaService } from '../../prisma/prisma.service';

function makeCtx(cookie?: string): { ctx: ExecutionContext; request: any } {
  const request: any = { cookies: {} };
  if (cookie !== undefined) request.cookies['staff_session'] = cookie;

  const ctx = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;

  return { ctx, request };
}

describe('StaffGuard', () => {
  let guard: StaffGuard;
  let db: { staffSession: { findUnique: jest.Mock; delete: jest.Mock } };

  beforeEach(() => {
    db = {
      staffSession: {
        findUnique: jest.fn(),
        delete: jest.fn().mockResolvedValue({}),
      },
    };
    guard = new StaffGuard(db as unknown as PrismaService);
  });

  it('throws UnauthorizedException when no cookie', async () => {
    const { ctx } = makeCtx();
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when session not found', async () => {
    db.staffSession.findUnique.mockResolvedValue(null);
    const { ctx } = makeCtx('some-token');
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException and deletes expired session', async () => {
    db.staffSession.findUnique.mockResolvedValue({
      id: 'sess-1',
      expiresAt: new Date(Date.now() - 1000),
      staff: { id: 'staff-1' },
    });
    const { ctx } = makeCtx('some-token');
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    expect(db.staffSession.delete).toHaveBeenCalled();
  });

  it('sets request.staff and returns true for valid session', async () => {
    const staff = { id: 'staff-1', email: 'staff@test.com' };
    db.staffSession.findUnique.mockResolvedValue({
      id: 'sess-1',
      expiresAt: new Date(Date.now() + 86400000),
      staff,
    });
    const { ctx, request } = makeCtx('valid-token');

    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
    expect(request.staff).toEqual(staff);
  });
});
