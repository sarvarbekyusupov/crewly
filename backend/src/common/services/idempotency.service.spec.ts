import { Test, TestingModule } from '@nestjs/testing';
import { IdempotencyService } from './idempotency.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('IdempotencyService', () => {
  let service: IdempotencyService;
  let db: {
    idempotencyKey: {
      findUnique: jest.Mock;
      upsert: jest.Mock;
    };
  };

  beforeEach(async () => {
    db = {
      idempotencyKey: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [IdempotencyService, { provide: PrismaService, useValue: db }],
    }).compile();

    service = module.get(IdempotencyService);
  });

  it('returns cached response on duplicate key', async () => {
    db.idempotencyKey.findUnique.mockResolvedValue({
      key: 'payment:evt-1',
      response: { ok: true },
    });

    const fn = jest.fn();
    const result = await service.execute('payment:evt-1', 72, fn);

    expect(result.cached).toBe(true);
    expect(result.value).toEqual({ ok: true });
    expect(fn).not.toHaveBeenCalled();
  });

  it('runs fn and stores response on first call', async () => {
    db.idempotencyKey.findUnique.mockResolvedValue(null);
    db.idempotencyKey.upsert.mockResolvedValue({});

    const result = await service.execute('telegram:99', 48, async () => ({
      ok: true,
    }));

    expect(result.cached).toBe(false);
    expect(result.value).toEqual({ ok: true });
    expect(db.idempotencyKey.upsert).toHaveBeenCalled();
  });
});
