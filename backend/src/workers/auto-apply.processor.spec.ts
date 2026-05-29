import { Test, TestingModule } from '@nestjs/testing';
import { AutoApplyProcessor } from './auto-apply.processor';
import { PrismaService } from '../prisma/prisma.service';
import { SeekerAgent } from '../modules/agents/seeker.agent';
import { HhApplyService } from '../integrations/apply/hh-apply.service';
import { HhClientService } from '../integrations/hh/hh-client.service';
import { HhTokenService } from '../integrations/hh/hh-token.service';
import { LinkedInApplyService } from '../integrations/apply/linkedin-apply.service';
import { ConfigService } from '@nestjs/config';
import { NonRetryableError } from './errors';

describe('AutoApplyProcessor', () => {
  let processor: AutoApplyProcessor;
  let db: any;
  let agent: { decideAndDraftApplication: jest.Mock };
  let hhApply: any;
  let linkedinApply: any;
  let config: any;

  const seekerApplicationId = 'sa-1';
  const makeJob = (id = seekerApplicationId) =>
    ({ data: { seekerApplicationId: id } }) as any;

  const baseCandidate = {
    id: 'cand-1',
    fullName: 'Bob',
    currentPosition: 'Dev',
    skills: ['Node.js'],
    yearsExperience: 2,
    city: 'Tashkent',
    email: 'bob@example.com',
    phone: '+998901234567',
    hhOauthToken: 'hh-tok',
    hhResumeId: 'res-1',
    agentSettings: { auto_apply: true },
  };

  const baseDiscoveredJob = {
    id: 'dj-1',
    title: 'Backend Dev',
    company: 'Corp',
    description: 'Build APIs',
    skills: ['Node.js'],
    sourceUrl: 'https://hh.ru/vacancy/99999999',
    source: 'hh.ru',
  };

  const baseApp = {
    id: seekerApplicationId,
    status: 'queued',
    source: 'hh.ru',
    candidate: baseCandidate,
    discoveredJob: baseDiscoveredJob,
    match: { score: 90 },
  };

  beforeEach(async () => {
    db = {
      seekerApplication: {
        findUnique: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        update: jest.fn().mockResolvedValue({}),
      },
      candidate: {
        findUnique: jest.fn().mockResolvedValue({ maxApplicationsPerDay: 5 }),
        update: jest.fn().mockResolvedValue({}),
      },
      seekerJobMatch: {
        findUnique: jest.fn().mockResolvedValue({ score: 90 }),
      },
    };

    agent = {
      decideAndDraftApplication: jest.fn().mockResolvedValue({
        should_apply: true,
        reason: 'Perfect match',
        cover_letter: 'Hi, I am Bob.',
      }),
    };
    hhApply = {
      apply: jest.fn().mockResolvedValue({ negotiationId: 'neg-99' }),
      getResumeId: jest.fn().mockResolvedValue('res-1'),
    };
    const hhClientMock = {
      getResume: jest.fn(),
      getVacancyDetail: jest.fn().mockResolvedValue({
        type: { id: 'standard' },
        area: { id: '1' },
      }),
    };
    linkedinApply = { apply: jest.fn().mockResolvedValue({ success: true }) };
    config = { get: jest.fn().mockReturnValue(null) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutoApplyProcessor,
        { provide: PrismaService, useValue: db },
        { provide: SeekerAgent, useValue: agent },
        { provide: HhApplyService, useValue: hhApply },
        { provide: HhClientService, useValue: hhClientMock },
        {
          provide: HhTokenService,
          useValue: {
            refreshCandidateToken: jest.fn(),
            getValidToken: jest.fn().mockResolvedValue('tok-abc'),
          },
        },
        { provide: LinkedInApplyService, useValue: linkedinApply },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    processor = module.get(AutoApplyProcessor);
  });

  it('returns early when status is not queued', async () => {
    db.seekerApplication.findUnique.mockResolvedValue({
      ...baseApp,
      status: 'applied',
    });

    await processor.handle(makeJob());

    expect(agent.decideAndDraftApplication).not.toHaveBeenCalled();
  });

  it('skips when SeekerAgent decides not to apply', async () => {
    db.seekerApplication.findUnique.mockResolvedValue(baseApp);
    agent.decideAndDraftApplication.mockResolvedValue({
      should_apply: false,
      reason: 'Salary too low',
    });

    await processor.handle(makeJob());

    expect(db.seekerApplication.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'skipped' }),
      }),
    );
  });

  it('returns early when daily limit is reached', async () => {
    db.seekerApplication.findUnique.mockResolvedValue(baseApp);
    db.seekerApplication.count.mockResolvedValue(5);
    db.candidate.findUnique.mockResolvedValue({ maxApplicationsPerDay: 5 });

    await processor.handle(makeJob());

    // Agent decision happens BEFORE daily limit check in this implementation? 
    // Actually limit check is usually before external calls.
    // In current implementation, agent decision is first.
    expect(hhApply.apply).not.toHaveBeenCalled();
  });

  it('throws NonRetryableError when seekerApplication not found', async () => {
    db.seekerApplication.findUnique.mockResolvedValue(null);

    await expect(processor.handle(makeJob())).rejects.toThrow(NonRetryableError);
  });

  describe('HH path', () => {
    it('throws NonRetryableError when no hhOauthToken', async () => {
      db.seekerApplication.findUnique.mockResolvedValue({
        ...baseApp,
        candidate: { ...baseCandidate, hhOauthToken: null },
      });

      await expect(processor.handle(makeJob())).rejects.toThrow(NonRetryableError);
    });

    it('saves cover letter before applying', async () => {
      db.seekerApplication.findUnique.mockResolvedValue(baseApp);

      await processor.handle(makeJob());

      expect(db.seekerApplication.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ coverLetter: 'Hi, I am Bob.' }),
        }),
      );
    });

    it('saves status=applied and hhNegotiationId on success', async () => {
      db.seekerApplication.findUnique.mockResolvedValue(baseApp);
      hhApply.apply.mockResolvedValue({ negotiationId: 'neg-99' });

      await processor.handle(makeJob());

      expect(db.seekerApplication.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'applied',
            hhNegotiationId: 'neg-99',
          }),
        }),
      );
    });

    it('throws NonRetryableError for direct vacancy type', async () => {
      db.seekerApplication.findUnique.mockResolvedValue(baseApp);
      const module = await Test.createTestingModule({
        providers: [
          AutoApplyProcessor,
          { provide: PrismaService, useValue: db },
          { provide: SeekerAgent, useValue: agent },
          { provide: HhApplyService, useValue: hhApply },
          {
            provide: HhClientService,
            useValue: { getVacancyDetail: jest.fn().mockResolvedValue({ type: { id: 'direct' } }) },
          },
          { provide: HhTokenService, useValue: { getValidToken: jest.fn().mockResolvedValue('tok') } },
          { provide: LinkedInApplyService, useValue: linkedinApply },
          { provide: ConfigService, useValue: config },
        ],
      }).compile();
      const proc = module.get(AutoApplyProcessor);

      await expect(proc.handle(makeJob())).rejects.toThrow(NonRetryableError);
    });

    it('throws NonRetryableError when vacancy ID not extractable from URL', async () => {
      db.seekerApplication.findUnique.mockResolvedValue({
        ...baseApp,
        discoveredJob: { ...baseDiscoveredJob, sourceUrl: 'https://hh.ru/employer/acme' },
      });

      await expect(processor.handle(makeJob())).rejects.toThrow(NonRetryableError);
    });

    it('resolves resume ID via HhApplyService when hhResumeId is null', async () => {
      db.seekerApplication.findUnique.mockResolvedValue({
        ...baseApp,
        candidate: { ...baseCandidate, hhResumeId: null },
      });
      hhApply.getResumeId.mockResolvedValue('fetched-resume');

      await processor.handle(makeJob());

      expect(hhApply.getResumeId).toHaveBeenCalled();
      expect(db.candidate.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { hhResumeId: 'fetched-resume' } }),
      );
    });

    it('throws NonRetryableError when resume ID cannot be resolved', async () => {
      db.seekerApplication.findUnique.mockResolvedValue({
        ...baseApp,
        candidate: { ...baseCandidate, hhResumeId: null },
      });
      hhApply.getResumeId.mockResolvedValue(null);

      await expect(processor.handle(makeJob())).rejects.toThrow(NonRetryableError);
    });
  });

  describe('LinkedIn path', () => {
    const linkedinApp = {
      ...baseApp,
      source: 'linkedin',
      discoveredJob: {
        ...baseDiscoveredJob,
        sourceUrl: 'https://linkedin.com/jobs/view/99999',
        source: 'linkedin',
      },
    };

    it('applies via LinkedIn and updates status to applied', async () => {
      db.seekerApplication.findUnique.mockResolvedValue(linkedinApp);

      await processor.handle(makeJob());

      expect(linkedinApply.apply).toHaveBeenCalled();
      expect(db.seekerApplication.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'applied' }),
        }),
      );
    });

    it('marks status as failed and rethrows when LinkedIn apply returns failure', async () => {
      db.seekerApplication.findUnique.mockResolvedValue(linkedinApp);
      linkedinApply.apply.mockResolvedValue({ success: false, message: 'Captcha required' });

      await expect(processor.handle(makeJob())).rejects.toThrow('Captcha required');
      expect(db.seekerApplication.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'failed', error: 'Captcha required' }),
        }),
      );
    });
  });

  it('throws NonRetryableError for unknown source', async () => {
    db.seekerApplication.findUnique.mockResolvedValue({ ...baseApp, source: 'monster' });

    await expect(processor.handle(makeJob())).rejects.toThrow(NonRetryableError);
  });

  it('marks status as failed and rethrows when HH apply throws', async () => {
    db.seekerApplication.findUnique.mockResolvedValue(baseApp);
    hhApply.apply.mockRejectedValue(new Error('HH 503'));

    await expect(processor.handle(makeJob())).rejects.toThrow('HH 503');
    expect(db.seekerApplication.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'failed', error: 'HH 503' }),
      }),
    );
  });
});
