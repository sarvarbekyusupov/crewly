import { Test, TestingModule } from '@nestjs/testing';
import { DashboardController } from './dashboard.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthGuard } from '../../common/guards/auth.guard';

describe('DashboardController', () => {
  let controller: DashboardController;
  let db: any;

  beforeEach(async () => {
    db = {
      job: { count: jest.fn().mockResolvedValue(0) },
      application: { count: jest.fn().mockResolvedValue(0) },
      placement: { count: jest.fn().mockResolvedValue(0) },
      invoice: { count: jest.fn().mockResolvedValue(0) },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [{ provide: PrismaService, useValue: db }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(DashboardController);
  });

  it('returns all stats for user company', async () => {
    db.job.count
      .mockResolvedValueOnce(3) // activeJobs
      .mockResolvedValueOnce(10); // totalJobs
    db.application.count
      .mockResolvedValueOnce(5) // inPipeline
      .mockResolvedValueOnce(20); // totalApplications
    db.placement.count
      .mockResolvedValueOnce(2) // activePlacements
      .mockResolvedValueOnce(8); // totalPlacements
    db.invoice.count
      .mockResolvedValueOnce(1) // pendingInvoices
      .mockResolvedValueOnce(4); // totalInvoices

    const user = { companyId: 'co-1' };
    const result = await controller.stats(user);

    expect(result).toEqual({
      activeJobs: 3,
      totalJobs: 10,
      inPipeline: 5,
      totalApplications: 20,
      activePlacements: 2,
      totalPlacements: 8,
      pendingInvoices: 1,
      totalInvoices: 4,
    });
  });
});
