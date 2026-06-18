import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CoverLetterService } from './cover-letter.service';

export interface ApplyKit {
  coverLetter: string;
  tailoredCvText: string;
  applyUrl: string;
  instructions: string;
}

@Injectable()
export class ApplyKitService {
  private readonly logger = new Logger(ApplyKitService.name);

  constructor(
    private readonly db: PrismaService,
    private readonly coverLetter: CoverLetterService,
  ) {}

  async build(candidateId: string, discoveredJobId: string): Promise<ApplyKit> {
    const [candidate, job] = await Promise.all([
      this.db.candidate.findUnique({
        where: { id: candidateId },
        select: {
          fullName: true,
          currentPosition: true,
          yearsExperience: true,
          city: true,
          skills: true,
          email: true,
          phone: true,
          languages: true,
          rawResumeText: true,
        },
      }),
      this.db.discoveredJob.findUnique({
        where: { id: discoveredJobId },
        select: {
          source: true,
          externalId: true,
          sourceUrl: true,
          title: true,
          company: true,
          description: true,
          skills: true,
        },
      }),
    ]);

    if (!candidate)
      throw new NotFoundException(`Candidate ${candidateId} not found`);
    if (!job)
      throw new NotFoundException(`DiscoveredJob ${discoveredJobId} not found`);

    const cover = await this.coverLetter.generate({
      candidateName: candidate.fullName ?? 'Candidate',
      currentPosition: candidate.currentPosition ?? undefined,
      skills: candidate.skills,
      yearsExperience: candidate.yearsExperience?.toString(),
      city: candidate.city ?? undefined,
      jobTitle: job.title,
      company: job.company,
      jobDescription: job.description ?? undefined,
      jobSkills: job.skills,
      candidateId,
    });

    const applyUrl = this.buildApplyUrl(
      job.source,
      job.externalId,
      job.sourceUrl,
    );
    const tailoredCvText = this.buildCvText(candidate, job.skills);
    const instructions = this.buildInstructions(job.source, applyUrl);

    return { coverLetter: cover, tailoredCvText, applyUrl, instructions };
  }

  private buildApplyUrl(
    source: string,
    externalId: string | null,
    sourceUrl: string,
  ): string {
    if (source === 'hh.ru' && externalId) {
      return `https://hh.uz/vacancy/${externalId}`;
    }
    return sourceUrl;
  }

  private buildCvText(
    candidate: {
      fullName: string | null;
      currentPosition: string | null;
      yearsExperience: any;
      city: string | null;
      skills: string[];
      email: string | null;
      phone: string | null;
      languages: any;
      rawResumeText: string | null;
    },
    jobSkills: string[],
  ): string {
    const jobSkillSet = new Set(jobSkills.map((s) => s.toLowerCase()));
    const highlighted = candidate.skills.filter((s) =>
      jobSkillSet.has(s.toLowerCase()),
    );
    const rest = candidate.skills.filter(
      (s) => !jobSkillSet.has(s.toLowerCase()),
    );
    const orderedSkills = [...highlighted, ...rest].slice(0, 12);

    const lines: string[] = [];
    if (candidate.fullName) lines.push(`**${candidate.fullName}**`);
    if (candidate.currentPosition) lines.push(candidate.currentPosition);
    if (candidate.city) lines.push(candidate.city);
    const contacts = [candidate.email, candidate.phone].filter(Boolean);
    if (contacts.length) lines.push(contacts.join(' | '));
    lines.push('');
    if (orderedSkills.length) {
      lines.push(`Skills: ${orderedSkills.join(', ')}`);
    }
    if (candidate.yearsExperience) {
      lines.push(`Experience: ${candidate.yearsExperience} years`);
    }
    if (candidate.languages) {
      try {
        const langs = Array.isArray(candidate.languages)
          ? candidate.languages
          : Object.values(candidate.languages as object);
        if (langs.length) lines.push(`Languages: ${langs.join(', ')}`);
      } catch {
        // ignore malformed languages JSON
      }
    }
    if (candidate.rawResumeText) {
      lines.push('');
      lines.push(candidate.rawResumeText.slice(0, 800));
    }
    return lines.join('\n');
  }

  private buildInstructions(source: string, applyUrl: string): string {
    if (source === 'hh.ru') {
      return [
        '1. Tap "Open on HH" below.',
        '2. Sign in to your HH.uz account if prompted.',
        '3. Click "Respond" (Откликнуться).',
        '4. Paste the cover letter from this message.',
        '5. Submit. Come back here and tap ✅ I applied.',
      ].join('\n');
    }
    return [
      `1. Open the job post: ${applyUrl}`,
      '2. Follow the channel/group instructions to apply.',
      '3. Use the cover letter below in your message.',
      '4. Come back here and tap ✅ I applied.',
    ].join('\n');
  }
}
