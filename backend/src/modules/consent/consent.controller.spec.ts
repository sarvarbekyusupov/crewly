import { Test, TestingModule } from '@nestjs/testing';
import { ConsentController } from './consent.controller';
import { ConsentService } from './consent.service';
import { AuthGuard } from '../../common/guards/auth.guard';

describe('ConsentController', () => {
  let controller: ConsentController;
  let svc: { findForCandidate: jest.Mock };

  beforeEach(async () => {
    svc = { findForCandidate: jest.fn().mockResolvedValue([]) };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConsentController],
      providers: [{ provide: ConsentService, useValue: svc }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(ConsentController);
  });

  it('delegates to service with companyId and candidateId', async () => {
    const user = { companyId: 'co-1' };
    await controller.findForCandidate(user, 'cand-1');
    expect(svc.findForCandidate).toHaveBeenCalledWith('co-1', 'cand-1');
  });
});
