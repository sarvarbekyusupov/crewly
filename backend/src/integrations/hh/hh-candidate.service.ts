import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { HhClientService } from './hh-client.service';

@Injectable()
export class HhCandidateService {
  private readonly logger = new Logger(HhCandidateService.name);

  constructor(
    private readonly db: PrismaService,
    private readonly hhClient: HhClientService,
  ) {}

  async findOrCreate(resumeId: string): Promise<{ id: string }> {
    const existing = await this.db.candidate.findFirst({
      where: { externalId: resumeId },
      select: { id: true },
    });
    if (existing) return existing;

    const resume = await this.hhClient.getResume(resumeId);
    const fullName =
      [resume.first_name, resume.last_name].filter(Boolean).join(' ') || null;

    if (!fullName) {
      this.logger.warn(
        { resumeId },
        'HH resume has no visible name — quota-gated?',
      );
    }

    try {
      const candidate = await this.db.candidate.create({
        data: {
          externalId: resumeId,
          fullName,
          currentPosition: resume.title,
          skills: resume.skill_set ?? [],
          yearsExperience: resume.total_experience
            ? Math.round(resume.total_experience.months / 12)
            : undefined,
        },
        select: { id: true },
      });
      this.logger.log(
        { resumeId, candidateId: candidate.id },
        'HH candidate created',
      );
      return candidate;
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        // Race: another request created this candidate between our findFirst and create
        const raced = await this.db.candidate.findFirst({
          where: { externalId: resumeId },
          select: { id: true },
        });
        if (raced) return raced;
      }
      throw err;
    }
  }
}
