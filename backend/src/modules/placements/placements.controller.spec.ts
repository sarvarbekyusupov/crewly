import { Test, TestingModule } from '@nestjs/testing';
import { PlacementsController } from './placements.controller';
import { PlacementsService } from './placements.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CompanyRoleGuard } from '../../common/guards/company-role.guard';

describe('PlacementsController', () => {
  let controller: PlacementsController;
  let svc: {
    findAll: jest.Mock;
    findOne: jest.Mock;
    recordSeparation: jest.Mock;
  };

  const user = { id: 'user-1', companyId: 'company-1', role: 'hiring_manager' };

  beforeEach(async () => {
    svc = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      recordSeparation: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlacementsController],
      providers: [{ provide: PlacementsService, useValue: svc }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(CompanyRoleGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(PlacementsController);
  });

  it('findAll delegates with page and limit', () => {
    svc.findAll.mockResolvedValue({ data: [], total: 0 });
    controller.findAll(user, '2', '10');
    expect(svc.findAll).toHaveBeenCalledWith('company-1', 2, 10);
  });

  it('findAll uses defaults when page/limit not provided', () => {
    svc.findAll.mockResolvedValue({ data: [], total: 0 });
    controller.findAll(user);
    expect(svc.findAll).toHaveBeenCalledWith('company-1', 1, 20);
  });

  it('findOne delegates to service', () => {
    svc.findOne.mockResolvedValue({ id: 'placement-1' });
    controller.findOne(user, 'placement-1');
    expect(svc.findOne).toHaveBeenCalledWith('company-1', 'placement-1');
  });

  it('recordSeparation delegates to service', () => {
    const body = { separationDate: '2026-05-01', replacementRequired: true };
    svc.recordSeparation.mockResolvedValue({
      placementId: 'placement-1',
      withinGuarantee: true,
    });
    controller.recordSeparation(user, 'placement-1', body);
    expect(svc.recordSeparation).toHaveBeenCalledWith(
      'company-1',
      'placement-1',
      body,
    );
  });
});
