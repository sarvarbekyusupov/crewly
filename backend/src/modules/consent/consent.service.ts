import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ConsentService {
  constructor(private readonly db: PrismaService) {}

  // Company users: only candidates in their pipeline
  async findForCandidate(companyId: string, candidateId: string) {
    const inPipeline = await this.db.application.findFirst({
      where: { companyId, candidateId },
      select: { id: true },
    });
    if (!inPipeline)
      throw new NotFoundException('Candidate not in your pipeline');

    return this.db.consentRecord.findMany({
      where: { candidateId },
      orderBy: { recordedAt: 'desc' },
    });
  }

  // Staff: all consent records for any candidate, optionally filtered
  async findAllForStaff(candidateId?: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const where = candidateId ? { candidateId } : {};
    const [data, total] = await Promise.all([
      this.db.consentRecord.findMany({
        where,
        include: {
          candidate: { select: { id: true, fullName: true, email: true } },
        },
        orderBy: { recordedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.db.consentRecord.count({ where }),
    ]);
    return { data, total, page, limit };
  }
}
