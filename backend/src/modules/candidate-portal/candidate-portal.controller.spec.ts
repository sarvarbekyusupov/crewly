import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { CandidatePortalController } from './candidate-portal.controller';
import { CandidatePortalService } from './candidate-portal.service';
import { HhSuggestsService } from '../../integrations/hh/hh-suggests.service';
import { CandidateAuthGuard } from '../candidate-auth/guards/candidate-auth.guard';
import { QUEUES } from '../../workers/queue-names';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('CandidatePortalController', () => {
  let controller: CandidatePortalController;
  let svc: {
    getProfile: jest.Mock;
    updateProfile: jest.Mock;
    uploadCv: jest.Mock;
    updatePreferences: jest.Mock;
    getApplications: jest.Mock;
    getDiscoveredJobs: jest.Mock;
    getSeekerApplications: jest.Mock;
    queueApplication: jest.Mock;
    updateSeekerApplicationStatus: jest.Mock;
  };
  let scoreQueue: { add: jest.Mock };
  let autoApplyQueue: { add: jest.Mock };

  const cand = { id: 'cand-1' };

  beforeEach(async () => {
    svc = {
      getProfile: jest.fn().mockResolvedValue({
        id: 'cand-1',
        minMatchScore: 70,
        blacklistedCompanies: [],
        maxApplicationsPerDay: 5,
        preferredWorkMode: 'remote',
        expectedSalaryUzs: null,
        hhResumeId: null,
        hhOauthToken: null,
        resumeFileUrl: null,
      }),
      updateProfile: jest.fn().mockResolvedValue({ id: 'cand-1' }),
      uploadCv: jest.fn().mockResolvedValue({ url: 'https://s3/cv.pdf' }),
      updatePreferences: jest.fn().mockResolvedValue({}),
      getApplications: jest.fn().mockResolvedValue([]),
      getDiscoveredJobs: jest.fn().mockResolvedValue({ data: [], total: 0 }),
      getSeekerApplications: jest.fn().mockResolvedValue([]),
      queueApplication: jest.fn().mockResolvedValue({ id: 'sa-1' }),
      updateSeekerApplicationStatus: jest
        .fn()
        .mockResolvedValue({ id: 'sa-1' }),
    };
    scoreQueue = { add: jest.fn().mockResolvedValue({}) };
    autoApplyQueue = { add: jest.fn().mockResolvedValue({}) };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CandidatePortalController],
      providers: [
        { provide: CandidatePortalService, useValue: svc },
        {
          provide: HhSuggestsService,
          useValue: {
            areas: jest.fn(),
            skills: jest.fn(),
            universities: jest.fn(),
          },
        },
        {
          provide: getQueueToken(QUEUES.SCORE_SEEKER_JOBS),
          useValue: scoreQueue,
        },
        { provide: getQueueToken(QUEUES.AUTO_APPLY), useValue: autoApplyQueue },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    })
      .overrideGuard(CandidateAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(CandidatePortalController);
  });

  it('getProfile delegates to service', async () => {
    await controller.getProfile(cand);
    expect(svc.getProfile).toHaveBeenCalledWith('cand-1');
  });

  it('updateProfile delegates and re-scores when skills change', async () => {
    await controller.updateProfile(cand, { skills: ['Node.js'] });
    expect(svc.updateProfile).toHaveBeenCalledWith('cand-1', {
      skills: ['Node.js'],
    });
    expect(scoreQueue.add).toHaveBeenCalled();
  });

  it('updateProfile does not re-score when skills not in dto', async () => {
    await controller.updateProfile(cand, { fullName: 'Alice' });
    expect(scoreQueue.add).not.toHaveBeenCalled();
  });

  it('uploadCv returns error when no file', async () => {
    const result = await controller.uploadCv(cand, undefined as any);
    expect(result).toEqual({ error: 'No file provided' });
  });

  it('uploadCv delegates to service when file provided', async () => {
    const file = {
      buffer: Buffer.from('pdf'),
      originalname: 'cv.pdf',
      mimetype: 'application/pdf',
    } as any;
    await controller.uploadCv(cand, file);
    expect(svc.uploadCv).toHaveBeenCalledWith(
      'cand-1',
      file.buffer,
      'cv.pdf',
      'application/pdf',
    );
  });

  it('getPreferences returns transformed profile fields', async () => {
    const result = await controller.getPreferences(cand);
    expect(result).toMatchObject({
      minMatchScore: 70,
      blacklistedCompanies: [],
      maxApplicationsPerDay: 5,
      expectedSalaryUzs: null,
    });
  });

  it('updatePreferences converts numeric expectedSalaryUzs to BigInt', async () => {
    await controller.updatePreferences(cand, { expectedSalaryUzs: 5000000 });
    expect(svc.updatePreferences).toHaveBeenCalledWith(
      'cand-1',
      expect.objectContaining({ expectedSalaryUzs: BigInt(5000000) }),
    );
  });

  it('getApplications delegates to service', async () => {
    await controller.getApplications(cand);
    expect(svc.getApplications).toHaveBeenCalledWith('cand-1');
  });

  it('getDiscoveredJobs passes parsed query params', async () => {
    await controller.getDiscoveredJobs(
      cand,
      'dev',
      'remote',
      '70',
      '1000000',
      'score',
      '2',
    );
    expect(svc.getDiscoveredJobs).toHaveBeenCalledWith('cand-1', {
      search: 'dev',
      workMode: 'remote',
      minScore: 70,
      minSalary: 1000000,
      sortBy: 'score',
      page: 2,
    });
  });

  it('getDiscoveredJobs defaults sortBy to recent', async () => {
    await controller.getDiscoveredJobs(
      cand,
      undefined,
      undefined,
      undefined,
      undefined,
      'other',
      '1',
    );
    expect(svc.getDiscoveredJobs).toHaveBeenCalledWith(
      'cand-1',
      expect.objectContaining({ sortBy: 'recent' }),
    );
  });

  it('triggerScoring enqueues job and returns queued', async () => {
    const result = await controller.triggerScoring(cand);
    expect(scoreQueue.add).toHaveBeenCalledWith(
      { candidateId: 'cand-1', limit: 50 },
      expect.any(Object),
    );
    expect(result).toEqual({ queued: true });
  });

  it('getSeekerApplications delegates to service', async () => {
    await controller.getSeekerApplications(cand);
    expect(svc.getSeekerApplications).toHaveBeenCalledWith('cand-1');
  });

  it('applyToJob creates seeker application and enqueues auto-apply', async () => {
    const result = await controller.applyToJob(cand, {
      discoveredJobId: 'dj-1',
    });
    expect(svc.queueApplication).toHaveBeenCalledWith('cand-1', 'dj-1');
    expect(autoApplyQueue.add).toHaveBeenCalledWith(
      { seekerApplicationId: 'sa-1' },
      expect.any(Object),
    );
    expect(result).toEqual({ id: 'sa-1' });
  });

  it('updateApplicationStatus delegates to service', async () => {
    await controller.updateApplicationStatus(cand, 'sa-1', {
      status: 'cancelled',
    });
    expect(svc.updateSeekerApplicationStatus).toHaveBeenCalledWith(
      'cand-1',
      'sa-1',
      'cancelled',
    );
  });
});
