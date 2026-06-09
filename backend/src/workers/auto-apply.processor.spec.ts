import { Test, TestingModule } from '@nestjs/testing';
import { AutoApplyProcessor } from './auto-apply.processor';
import { PrismaService } from '../prisma/prisma.service';
import { SeekerAgent } from '../modules/agents/seeker.agent';
import { HhClientService } from '../integrations/hh/hh-client.service';
import { LinkedInApplyService } from '../integrations/apply/linkedin-apply.service';
import { ConfigService } from '@nestjs/config';
import { NonRetryableError } from './errors';

describe('AutoApplyProcessor', () => {
  let processor: AutoApplyProcessor;
  let db: any;
  let agent: { decideAndDraftApplication: jest.Mock };
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
    agentSettings: { auto_apply: true },
  };

  const baseDiscoveredJob = {
    id: 'dj-1',
    title: 'Backend Dev',
    company: 'Corp',
    description: 'Build APIs',
    skills: ['Node.js'],
    sourceUrl: 'https://linkedin.com/jobs/view/99999',
    source: 'linkedin',
  };

  const baseApp = {
    id: seekerApplicationId,
    status: 'queued',
    source: 'linkedin',
    candidate: baseCandidate,
    discoveredJob: baseDiscoveredJob,
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
    linkedinApply = { apply: jest.fn().mockResolvedValue({ success: true }) };
    config = { get: jest.fn().mockReturnValue(null) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutoApplyProcessor,
        { provide: PrismaService, useValue: db },
        { provide: SeekerAgent, useValue: agent },
        { provide: HhClientService, useValue: {} },
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

  it('throws NonRetryableError when seekerApplication not found', async () => {
    db.seekerApplication.findUnique.mockResolvedValue(null);

    await expect(processor.handle(makeJob())).rejects.toThrow(
      NonRetryableError,
    );
  });

  it('throws NonRetryableError for hh.ru source (deprecated)', async () => {
    db.seekerApplication.findUnique.mockResolvedValue({
      ...baseApp,
      source: 'hh.ru',
    });

    await expect(processor.handle(makeJob())).rejects.toThrow(
      NonRetryableError,
    );
  });

  it('throws NonRetryableError for unknown source', async () => {
    db.seekerApplication.findUnique.mockResolvedValue({
      ...baseApp,
      source: 'monster',
    });

    await expect(processor.handle(makeJob())).rejects.toThrow(
      NonRetryableError,
    );
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

    expect(linkedinApply.apply).not.toHaveBeenCalled();
  });

  describe('LinkedIn path', () => {
    it('applies via LinkedIn and updates status to applied', async () => {
      db.seekerApplication.findUnique.mockResolvedValue(baseApp);

      await processor.handle(makeJob());

      expect(linkedinApply.apply).toHaveBeenCalled();
      expect(db.seekerApplication.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'applied' }),
        }),
      );
    });

    it('marks status as failed and rethrows when LinkedIn apply returns failure', async () => {
      db.seekerApplication.findUnique.mockResolvedValue(baseApp);
      linkedinApply.apply.mockResolvedValue({
        success: false,
        message: 'Captcha required',
      });

      await expect(processor.handle(makeJob())).rejects.toThrow(
        'Captcha required',
      );
      expect(db.seekerApplication.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'failed',
            error: 'Captcha required',
          }),
        }),
      );
    });
  });
});
