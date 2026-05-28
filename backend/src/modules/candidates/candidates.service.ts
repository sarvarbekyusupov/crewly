import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { S3Service } from '../../integrations/storage/s3.service';

@Injectable()
export class CandidatesService {
  constructor(
    private readonly db: PrismaService,
    private readonly s3: S3Service,
  ) {}

  // Client view: only candidates in their pipeline
  async findAll(
    companyId: string,
    filters?: {
      search?: string;
      page?: number;
      limit?: number;
      sortBy?: 'score' | 'recent';
    },
  ) {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.CandidateWhereInput = {
      applications: { some: { companyId } },
      deletedAt: null,
      ...(filters?.search && {
        OR: [
          { fullName: { contains: filters.search, mode: 'insensitive' } },
          {
            currentPosition: { contains: filters.search, mode: 'insensitive' },
          },
          { currentCompany: { contains: filters.search, mode: 'insensitive' } },
          { city: { contains: filters.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [candidates, total] = await Promise.all([
      this.db.candidate.findMany({
        where,
        include: {
          applications: {
            where: { companyId },
            select: { id: true, status: true, matchScore: true, jobId: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.db.candidate.count({ where }),
    ]);

    const STATUS_PRIORITY: Record<string, number> = {
      hired: 100,
      offered: 90,
      interview_scheduled: 80,
      interviewed: 75,
      screened_pass: 70,
      screening: 60,
      responded: 50,
      outreach_sent: 40,
      matched: 30,
      no_contact: 20,
      withdrew: 10,
      rejected_by_client: 5,
      screened_fail: 5,
    };

    const data = candidates.map((c) => {
      const apps = c.applications;
      let bestApp = apps[0];
      for (const app of apps) {
        const p = STATUS_PRIORITY[app.status] ?? 0;
        const bp = STATUS_PRIORITY[bestApp?.status ?? ''] ?? 0;
        if (p > bp) bestApp = app;
      }
      return {
        ...c,
        applications: undefined,
        applicationId: bestApp?.id,
        status: bestApp?.status,
        matchScore: bestApp?.matchScore,
      };
    });

    if (filters?.sortBy === 'score') {
      data.sort((a, b) => {
        const sa = a.matchScore != null ? Number(a.matchScore) : -1;
        const sb = b.matchScore != null ? Number(b.matchScore) : -1;
        return sb - sa;
      });
    }

    return { data, total, page, limit };
  }

  async getOutreachHistory(companyId: string, candidateId: string) {
    const apps = await this.db.application.findMany({
      where: { companyId, candidateId },
      select: {
        id: true,
        outreachAttempts: true,
        job: { select: { id: true, title: true } },
      },
    });
    return apps
      .flatMap((a) =>
        a.outreachAttempts.map((attempt) => ({
          ...attempt,
          jobId: a.job.id,
          jobTitle: a.job.title,
        })),
      )
      .sort(
        (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime(),
      );
  }

  async findOne(companyId: string, candidateId: string) {
    const app = (await this.db.application.findFirst({
      where: { companyId, candidateId },
      include: { candidate: true },
    })) as any;

    if (!app || app.candidate?.deletedAt)
      throw new NotFoundException('Candidate not in your pipeline');
    return app.candidate;
  }

  // Staff-only: unfiltered
  async findAllForStaff(filters?: {
    doNotContact?: boolean;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 50;
    const skip = (page - 1) * limit;
    const where = {
      deletedAt: null,
      ...(filters?.doNotContact !== undefined && {
        doNotContact: filters.doNotContact,
      }),
    };
    const [data, total] = await Promise.all([
      this.db.candidate.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.db.candidate.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async uploadResume(
    companyId: string,
    candidateId: string,
    buffer: Buffer,
    originalname: string,
    mimetype: string,
  ): Promise<{ url: string }> {
    // Verify candidate is in this company's pipeline
    const app = await this.db.application.findFirst({
      where: { companyId, candidateId },
    });
    if (!app) throw new NotFoundException('Candidate not in your pipeline');

    const ext = originalname.split('.').pop() ?? 'bin';
    const key = `resumes/${candidateId}/${Date.now()}.${ext}`;
    const publicUrl = await this.s3.upload(key, buffer, mimetype);
    const signedUrl = publicUrl ? await this.s3.getSignedUrl(key, 3600) : '';

    await this.db.candidate.update({
      where: { id: candidateId },
      data: { resumeFileUrl: publicUrl || null },
    });

    return { url: signedUrl || publicUrl };
  }

  async markDoNotContact(candidateId: string) {
    const candidate = await this.db.candidate.findUnique({
      where: { id: candidateId },
    });
    if (!candidate) throw new NotFoundException('Candidate not found');

    await this.db.$transaction([
      this.db.candidate.update({
        where: { id: candidateId },
        data: {
          doNotContact: true,
          consentStatus: 'withdrawn',
          consentWithdrawnAt: new Date(),
        },
      }),
      this.db.consentRecord.create({
        data: {
          candidateId,
          action: 'withdrawn',
          basis: 'staff_action',
        },
      }),
    ]);
  }
}
