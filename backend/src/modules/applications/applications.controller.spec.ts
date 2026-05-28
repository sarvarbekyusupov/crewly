import { Test, TestingModule } from '@nestjs/testing';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CompanyRoleGuard } from '../../common/guards/company-role.guard';
import { ThrottlerGuard } from '@nestjs/throttler';

describe('ApplicationsController', () => {
  let controller: ApplicationsController;
  let svc: {
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    approve: jest.Mock;
    reject: jest.Mock;
    markInterviewed: jest.Mock;
    makeOffer: jest.Mock;
    hire: jest.Mock;
    scheduleInterview: jest.Mock;
    getDossier: jest.Mock;
    retryOutreach: jest.Mock;
    bulkReject: jest.Mock;
    bulkApprove: jest.Mock;
  };

  const user = { id: 'user-1', companyId: 'company-1', role: 'hiring_manager' };

  beforeEach(async () => {
    svc = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      approve: jest.fn(),
      reject: jest.fn(),
      markInterviewed: jest.fn(),
      makeOffer: jest.fn(),
      hire: jest.fn(),
      scheduleInterview: jest.fn(),
      getDossier: jest.fn(),
      retryOutreach: jest.fn(),
      bulkReject: jest.fn(),
      bulkApprove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApplicationsController],
      providers: [{ provide: ApplicationsService, useValue: svc }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(CompanyRoleGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(ApplicationsController);
  });

  it('findAll delegates with filters', () => {
    svc.findAll.mockResolvedValue({ data: [] });
    controller.findAll(user, 'job-1', 'matched', '1', '20');
    expect(svc.findAll).toHaveBeenCalledWith('company-1', {
      jobId: 'job-1',
      status: 'matched',
      page: 1,
      limit: 20,
    });
  });

  it('findOne delegates to service', () => {
    svc.findOne.mockResolvedValue({ id: 'app-1' });
    controller.findOne(user, 'app-1');
    expect(svc.findOne).toHaveBeenCalledWith('company-1', 'app-1');
  });

  it('update delegates to service', () => {
    const dto = { hiringManagerNotes: 'Good candidate' };
    svc.update.mockResolvedValue({});
    controller.update(user, 'app-1', dto);
    expect(svc.update).toHaveBeenCalledWith('company-1', 'app-1', dto);
  });

  it('approve delegates to service with userId', () => {
    svc.approve.mockResolvedValue({});
    controller.approve(user, 'app-1');
    expect(svc.approve).toHaveBeenCalledWith('company-1', 'app-1', 'user-1');
  });

  it('reject delegates to service with reason and userId', () => {
    svc.reject.mockResolvedValue({});
    controller.reject(user, 'app-1', { reason: 'Not a fit' });
    expect(svc.reject).toHaveBeenCalledWith(
      'company-1',
      'app-1',
      'Not a fit',
      'user-1',
    );
  });

  it('markInterviewed delegates to service', () => {
    svc.markInterviewed.mockResolvedValue({});
    controller.markInterviewed(user, 'app-1');
    expect(svc.markInterviewed).toHaveBeenCalledWith(
      'company-1',
      'app-1',
      'user-1',
    );
  });

  it('makeOffer delegates to service', () => {
    svc.makeOffer.mockResolvedValue({});
    controller.makeOffer(user, 'app-1');
    expect(svc.makeOffer).toHaveBeenCalledWith('company-1', 'app-1', 'user-1');
  });

  it('hire delegates to service with dto and userId', () => {
    const dto = { agreedSalaryUzs: 10_000_000, startDate: '2026-06-01' };
    svc.hire.mockResolvedValue({ id: 'placement-1' });
    controller.hire(user, 'app-1', dto);
    expect(svc.hire).toHaveBeenCalledWith('company-1', 'app-1', dto, 'user-1');
  });

  it('scheduleInterview delegates to service', () => {
    const dto = {
      startTime: '2026-06-10T10:00:00Z',
      endTime: '2026-06-10T11:00:00Z',
      attendeeEmails: ['a@test.com'],
      timeZone: 'UTC',
    };
    svc.scheduleInterview.mockResolvedValue({});
    controller.scheduleInterview(user, 'app-1', dto);
    expect(svc.scheduleInterview).toHaveBeenCalledWith(
      'company-1',
      'app-1',
      dto,
      'user-1',
    );
  });

  it('getDossier delegates to service', () => {
    svc.getDossier.mockResolvedValue({ url: 'https://dossier.url' });
    controller.getDossier(user, 'app-1');
    expect(svc.getDossier).toHaveBeenCalledWith('company-1', 'app-1');
  });

  it('retryOutreach delegates to service', () => {
    svc.retryOutreach.mockResolvedValue({});
    controller.retryOutreach(user, 'app-1');
    expect(svc.retryOutreach).toHaveBeenCalledWith('company-1', 'app-1');
  });

  it('bulkReject delegates with ids and reason', () => {
    svc.bulkReject.mockResolvedValue({ count: 2 });
    controller.bulkReject(user, {
      ids: ['app-1', 'app-2'],
      reason: 'Not a fit',
    });
    expect(svc.bulkReject).toHaveBeenCalledWith(
      'company-1',
      ['app-1', 'app-2'],
      'Not a fit',
      'user-1',
    );
  });

  it('bulkApprove delegates with ids', () => {
    svc.bulkApprove.mockResolvedValue({ count: 2 });
    controller.bulkApprove(user, { ids: ['app-1', 'app-2'] });
    expect(svc.bulkApprove).toHaveBeenCalledWith(
      'company-1',
      ['app-1', 'app-2'],
      'user-1',
    );
  });
});
