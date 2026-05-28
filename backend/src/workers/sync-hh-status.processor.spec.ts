import { Test, TestingModule } from '@nestjs/testing';
import { SyncHhStatusProcessor } from './sync-hh-status.processor';
import { PrismaService } from '../prisma/prisma.service';
import { HhClientService } from '../integrations/hh/hh-client.service';
import { HhTokenService } from '../integrations/hh/hh-token.service';
import { HhNegotiationsService } from '../integrations/hh/hh-negotiations.service';

describe('SyncHhStatusProcessor', () => {
  let processor: SyncHhStatusProcessor;
  let db: any;
  let hh: any;

  const mockJob = {} as any;

  const makeApp = (overrides: object = {}) => ({
    id: 'app-1',
    hhNegotiationId: 'neg-1',
    status: 'applied',
    source: 'hh.ru',
    candidate: { id: 'cand-1', hhOauthToken: 'tok-abc' },
    ...overrides,
  });

  beforeEach(async () => {
    db = {
      seekerApplication: {
        findMany: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
      application: {
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue({}),
      },
      job: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    hh = { getNegotiationStatus: jest.fn() };
    const hhNegMock = {
      getEmployerNegotiationState: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncHhStatusProcessor,
        { provide: PrismaService, useValue: db },
        { provide: HhClientService, useValue: hh },
        { provide: HhTokenService, useValue: { refreshCandidateToken: jest.fn(), getValidToken: jest.fn().mockResolvedValue('tok-abc') } },
        { provide: HhNegotiationsService, useValue: hhNegMock },
      ],
    }).compile();

    processor = module.get(SyncHhStatusProcessor);
  });

  it('returns early when no applications found', async () => {
    db.seekerApplication.findMany.mockResolvedValue([]);

    await processor.handle(mockJob);

    expect(hh.getNegotiationStatus).not.toHaveBeenCalled();
    expect(db.seekerApplication.update).not.toHaveBeenCalled();
  });

  it('maps HH state "invitation" → status "interview"', async () => {
    db.seekerApplication.findMany.mockResolvedValue([makeApp()]);
    hh.getNegotiationStatus.mockResolvedValue('invitation');

    await processor.handle(mockJob);

    expect(db.seekerApplication.update).toHaveBeenCalledWith({
      where: { id: 'app-1' },
      data: { status: 'interview' },
    });
  });

  it('maps HH state "discard" → status "rejected"', async () => {
    db.seekerApplication.findMany.mockResolvedValue([makeApp()]);
    hh.getNegotiationStatus.mockResolvedValue('discard');

    await processor.handle(mockJob);

    expect(db.seekerApplication.update).toHaveBeenCalledWith({
      where: { id: 'app-1' },
      data: { status: 'rejected' },
    });
  });

  it('maps HH state "discard_after_interview" → status "rejected"', async () => {
    db.seekerApplication.findMany.mockResolvedValue([makeApp()]);
    hh.getNegotiationStatus.mockResolvedValue('discard_after_interview');

    await processor.handle(mockJob);

    expect(db.seekerApplication.update).toHaveBeenCalledWith({
      where: { id: 'app-1' },
      data: { status: 'rejected' },
    });
  });

  it('does not update when HH state is unknown', async () => {
    db.seekerApplication.findMany.mockResolvedValue([makeApp()]);
    hh.getNegotiationStatus.mockResolvedValue('some_unknown_state');

    await processor.handle(mockJob);

    expect(db.seekerApplication.update).not.toHaveBeenCalled();
  });

  it('does not update when status already matches new status', async () => {
    db.seekerApplication.findMany.mockResolvedValue([
      makeApp({ status: 'interview' }),
    ]);
    hh.getNegotiationStatus.mockResolvedValue('invitation');

    await processor.handle(mockJob);

    expect(db.seekerApplication.update).not.toHaveBeenCalled();
  });

  it('marks as rejected on 404 response', async () => {
    db.seekerApplication.findMany.mockResolvedValue([makeApp()]);
    const err = Object.assign(new Error('Not Found'), {
      response: { status: 404 },
    });
    hh.getNegotiationStatus.mockRejectedValue(err);

    await processor.handle(mockJob);

    expect(db.seekerApplication.update).toHaveBeenCalledWith({
      where: { id: 'app-1' },
      data: { status: 'rejected', error: 'HH negotiation not found' },
    });
  });

  it('skips app without updating on 403 response', async () => {
    db.seekerApplication.findMany.mockResolvedValue([makeApp()]);
    const err = Object.assign(new Error('Forbidden'), {
      response: { status: 403 },
    });
    hh.getNegotiationStatus.mockRejectedValue(err);

    await processor.handle(mockJob);

    expect(db.seekerApplication.update).not.toHaveBeenCalled();
  });

  it('skips app when hhOauthToken is null', async () => {
    db.seekerApplication.findMany.mockResolvedValue([
      makeApp({ candidate: { id: 'cand-1', hhOauthToken: null } }),
    ]);

    await processor.handle(mockJob);

    // It should not even try to fetch status if token is missing
    expect(hh.getNegotiationStatus).not.toHaveBeenCalled();
    expect(db.seekerApplication.update).not.toHaveBeenCalled();
  });
});
