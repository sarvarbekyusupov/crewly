import { Test, TestingModule } from '@nestjs/testing';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CompanyRoleGuard } from '../../common/guards/company-role.guard';
import { ThrottlerGuard } from '@nestjs/throttler';

describe('JobsController', () => {
  let controller: JobsController;
  let svc: {
    findAll: jest.Mock;
    create: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    activate: jest.Mock;
    pause: jest.Mock;
    close: jest.Mock;
    softDelete: jest.Mock;
    sendOutreach: jest.Mock;
    getApplications: jest.Mock;
    getStats: jest.Mock;
  };

  const user = { id: 'user-1', companyId: 'company-1', role: 'admin' as const };

  beforeEach(async () => {
    svc = {
      findAll: jest.fn(),
      create: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      activate: jest.fn(),
      pause: jest.fn(),
      close: jest.fn(),
      softDelete: jest.fn(),
      sendOutreach: jest.fn(),
      getApplications: jest.fn(),
      getStats: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [JobsController],
      providers: [{ provide: JobsService, useValue: svc }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(CompanyRoleGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(JobsController);
  });

  it('findAll delegates to service', () => {
    svc.findAll.mockResolvedValue({ data: [], total: 0 });
    controller.findAll(user, 'active', '2', '10');
    expect(svc.findAll).toHaveBeenCalledWith('company-1', {
      status: 'active',
      page: 2,
      limit: 10,
    });
  });

  it('create delegates to service with companyId and userId', () => {
    const dto = { title: 'Dev' } as any;
    svc.create.mockResolvedValue({ id: 'job-1' });
    controller.create(user, dto);
    expect(svc.create).toHaveBeenCalledWith('company-1', 'user-1', dto);
  });

  it('findOne delegates to service', () => {
    svc.findOne.mockResolvedValue({ id: 'job-1' });
    controller.findOne(user, 'job-1');
    expect(svc.findOne).toHaveBeenCalledWith('company-1', 'job-1');
  });

  it('update delegates to service', () => {
    const dto = { title: 'Updated' } as any;
    svc.update.mockResolvedValue({ id: 'job-1' });
    controller.update(user, 'job-1', dto);
    expect(svc.update).toHaveBeenCalledWith('company-1', 'job-1', dto);
  });

  it('activate delegates to service', () => {
    svc.activate.mockResolvedValue({});
    controller.activate(user, 'job-1');
    expect(svc.activate).toHaveBeenCalledWith('company-1', 'job-1');
  });

  it('pause delegates to service', () => {
    svc.pause.mockResolvedValue({});
    controller.pause(user, 'job-1');
    expect(svc.pause).toHaveBeenCalledWith('company-1', 'job-1');
  });

  it('close delegates to service', () => {
    svc.close.mockResolvedValue({});
    controller.close(user, 'job-1');
    expect(svc.close).toHaveBeenCalledWith('company-1', 'job-1');
  });

  it('remove delegates softDelete to service', () => {
    svc.softDelete.mockResolvedValue({});
    controller.remove(user, 'job-1');
    expect(svc.softDelete).toHaveBeenCalledWith('company-1', 'job-1');
  });

  it('sendOutreach delegates to service', () => {
    svc.sendOutreach.mockResolvedValue({ queued: 3 });
    controller.sendOutreach(user, 'job-1');
    expect(svc.sendOutreach).toHaveBeenCalledWith('company-1', 'job-1');
  });

  it('getApplications delegates to service with parsed page/limit', () => {
    svc.getApplications.mockResolvedValue({ data: [], total: 0 });
    controller.getApplications(user, 'job-1', '3', '5');
    expect(svc.getApplications).toHaveBeenCalledWith(
      'company-1',
      'job-1',
      3,
      5,
    );
  });

  it('getStats delegates to service', () => {
    svc.getStats.mockResolvedValue({ matched: 2 });
    controller.getStats(user, 'job-1');
    expect(svc.getStats).toHaveBeenCalledWith('company-1', 'job-1');
  });
});
