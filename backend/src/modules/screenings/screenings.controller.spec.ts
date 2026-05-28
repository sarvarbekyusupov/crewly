import { Test, TestingModule } from '@nestjs/testing';
import { ScreeningsController } from './screenings.controller';
import { ScreeningsService } from './screenings.service';
import { AuthGuard } from '../../common/guards/auth.guard';

describe('ScreeningsController', () => {
  let controller: ScreeningsController;
  let svc: {
    findByApplication: jest.Mock;
    create: jest.Mock;
    findOne: jest.Mock;
    escalate: jest.Mock;
  };

  const user = { id: 'user-1', companyId: 'company-1' };

  beforeEach(async () => {
    svc = {
      findByApplication: jest.fn(),
      create: jest.fn(),
      findOne: jest.fn(),
      escalate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ScreeningsController],
      providers: [{ provide: ScreeningsService, useValue: svc }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(ScreeningsController);
  });

  it('findByApplication delegates to service', () => {
    svc.findByApplication.mockResolvedValue([]);
    controller.findByApplication(user, 'app-1');
    expect(svc.findByApplication).toHaveBeenCalledWith('app-1', 'company-1');
  });

  it('create delegates to service', () => {
    svc.create.mockResolvedValue({ id: 'screening-1' });
    controller.create(user, 'app-1');
    expect(svc.create).toHaveBeenCalledWith('app-1', 'company-1');
  });

  it('findOne delegates to service', () => {
    svc.findOne.mockResolvedValue({ id: 'screening-1' });
    controller.findOne(user, 'screening-1');
    expect(svc.findOne).toHaveBeenCalledWith('screening-1', 'company-1');
  });

  it('escalate delegates to service with reason', () => {
    svc.escalate.mockResolvedValue({ id: 'screening-1', status: 'escalated' });
    controller.escalate(user, 'screening-1', {
      reason: 'candidate unresponsive',
    });
    expect(svc.escalate).toHaveBeenCalledWith(
      'screening-1',
      'company-1',
      'candidate unresponsive',
    );
  });
});
