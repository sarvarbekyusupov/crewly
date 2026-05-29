import { Test, TestingModule } from '@nestjs/testing';
import { CompaniesController } from './companies.controller';
import { CompaniesService } from './companies.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CompanyRoleGuard } from '../../common/guards/company-role.guard';

describe('CompaniesController', () => {
  let controller: CompaniesController;
  let svc: {
    getMe: jest.Mock;
    updateMe: jest.Mock;
    getUsers: jest.Mock;
    inviteUser: jest.Mock;
    removeUser: jest.Mock;
  };

  const user = { id: 'user-1', companyId: 'company-1', role: 'admin' as const };

  beforeEach(async () => {
    svc = {
      getMe: jest.fn(),
      updateMe: jest.fn(),
      getUsers: jest.fn(),
      inviteUser: jest.fn(),
      removeUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CompaniesController],
      providers: [{ provide: CompaniesService, useValue: svc }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(CompanyRoleGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(CompaniesController);
  });

  it('getMe delegates to service', () => {
    svc.getMe.mockResolvedValue({ id: 'company-1', name: 'Acme' });
    controller.getMe(user);
    expect(svc.getMe).toHaveBeenCalledWith('company-1');
  });

  it('updateMe delegates to service', () => {
    const dto = { name: 'NewName' };
    svc.updateMe.mockResolvedValue({ id: 'company-1', name: 'NewName' });
    controller.updateMe(user, dto);
    expect(svc.updateMe).toHaveBeenCalledWith('company-1', dto);
  });

  it('getUsers delegates to service', () => {
    svc.getUsers.mockResolvedValue([]);
    controller.getUsers(user);
    expect(svc.getUsers).toHaveBeenCalledWith('company-1');
  });

  it('inviteUser delegates to service', () => {
    const dto = {
      email: 'new@test.com',
      fullName: 'New User',
      role: 'admin' as const,
    };
    svc.inviteUser.mockResolvedValue({ id: 'new-user' });
    controller.inviteUser(user, dto);
    expect(svc.inviteUser).toHaveBeenCalledWith('company-1', dto);
  });

  it('removeUser delegates to service', () => {
    svc.removeUser.mockResolvedValue({ id: 'user-2', deletedAt: new Date() });
    controller.removeUser(user, 'user-2');
    expect(svc.removeUser).toHaveBeenCalledWith('company-1', 'user-2');
  });
});
