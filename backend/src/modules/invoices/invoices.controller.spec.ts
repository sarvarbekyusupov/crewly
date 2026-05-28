import { Test, TestingModule } from '@nestjs/testing';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { AuthGuard } from '../../common/guards/auth.guard';

describe('InvoicesController', () => {
  let controller: InvoicesController;
  let svc: {
    findAll: jest.Mock;
    findOne: jest.Mock;
    markPaid: jest.Mock;
  };

  const user = { id: 'user-1', companyId: 'company-1', role: 'owner' };

  beforeEach(async () => {
    svc = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      markPaid: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvoicesController],
      providers: [{ provide: InvoicesService, useValue: svc }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(InvoicesController);
  });

  it('findAll delegates with status, page, limit', () => {
    svc.findAll.mockResolvedValue({ data: [] });
    controller.findAll(user, 'issued', '2', '5');
    expect(svc.findAll).toHaveBeenCalledWith('company-1', 'issued', 2, 5);
  });

  it('findAll uses defaults when params not provided', () => {
    svc.findAll.mockResolvedValue({ data: [] });
    controller.findAll(user);
    expect(svc.findAll).toHaveBeenCalledWith('company-1', undefined, 1, 20);
  });

  it('findOne delegates to service', () => {
    svc.findOne.mockResolvedValue({ id: 'invoice-1' });
    controller.findOne(user, 'invoice-1');
    expect(svc.findOne).toHaveBeenCalledWith('company-1', 'invoice-1');
  });

  it('markPaid delegates with user role', () => {
    const dto = { paymentReference: 'REF-001' };
    svc.markPaid.mockResolvedValue({ id: 'invoice-1', status: 'paid' });
    controller.markPaid(user, 'invoice-1', dto);
    expect(svc.markPaid).toHaveBeenCalledWith(
      'company-1',
      'invoice-1',
      'owner',
      dto,
    );
  });
});
