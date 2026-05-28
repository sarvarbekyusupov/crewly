import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('api/v1/dashboard')
@UseGuards(AuthGuard)
export class DashboardController {
  constructor(private readonly db: PrismaService) {}

  @Get('stats')
  async stats(@CurrentUser() user: any) {
    const companyId: string = user.companyId;

    const [
      activeJobs,
      totalJobs,
      inPipeline,
      totalApplications,
      activePlacements,
      totalPlacements,
      pendingInvoices,
      totalInvoices,
    ] = await Promise.all([
      this.db.job.count({
        where: { companyId, status: 'active', deletedAt: null },
      }),
      this.db.job.count({ where: { companyId, deletedAt: null } }),
      this.db.application.count({
        where: {
          companyId,
          status: { in: ['screening', 'delivered', 'interview_scheduled'] },
        },
      }),
      this.db.application.count({ where: { companyId } }),
      this.db.placement.count({
        where: { companyId, candidateStillEmployed: true },
      }),
      this.db.placement.count({ where: { companyId } }),
      this.db.invoice.count({
        where: { companyId, status: { in: ['issued', 'overdue'] } },
      }),
      this.db.invoice.count({ where: { companyId } }),
    ]);

    return {
      activeJobs,
      totalJobs,
      inPipeline,
      totalApplications,
      activePlacements,
      totalPlacements,
      pendingInvoices,
      totalInvoices,
    };
  }
}
