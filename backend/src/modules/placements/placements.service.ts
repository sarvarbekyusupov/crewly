import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PlacementsService {
  constructor(private readonly db: PrismaService) {}

  async findAll(companyId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = { companyId };
    const include = {
      candidate: { select: { id: true, fullName: true } },
      job: { select: { id: true, title: true } },
      invoices: {
        select: { id: true, invoiceNumber: true, status: true, totalUzs: true },
      },
    };
    const [data, total] = await Promise.all([
      this.db.placement.findMany({
        where,
        include,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.db.placement.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async findOne(companyId: string, id: string) {
    const placement = await this.db.placement.findFirst({
      where: { id, companyId },
      include: {
        candidate: true,
        job: true,
        invoices: true,
      },
    });
    if (!placement) throw new NotFoundException('Placement not found');
    return placement;
  }

  async recordSeparation(
    companyId: string,
    id: string,
    data: { separationDate: string; replacementRequired?: boolean },
  ) {
    const placement = await this.findOne(companyId, id);

    const separationDate = new Date(data.separationDate);
    const guaranteeExpiry = placement.guaranteeExpiresAt
      ? new Date(placement.guaranteeExpiresAt)
      : null;
    const withinGuarantee = guaranteeExpiry
      ? separationDate <= guaranteeExpiry
      : false;

    await this.db.placement.update({
      where: { id },
      data: {
        candidateStillEmployed: false,
        separationDate,
        replacementRequired: data.replacementRequired ?? withinGuarantee,
      },
    });

    await this.db.candidate.update({
      where: { id: placement.candidateId },
      data: { lastActiveAt: new Date() },
    });

    return {
      placementId: id,
      withinGuarantee,
      replacementRequired: data.replacementRequired ?? withinGuarantee,
    };
  }
}
