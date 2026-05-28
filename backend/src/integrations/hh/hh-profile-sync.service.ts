import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';
import { HhResumeSummary } from './hh.types';

@Injectable()
export class HhProfileSyncService {
  private readonly logger = new Logger(HhProfileSyncService.name);
  private readonly baseUrl = 'https://api.hh.ru';

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
    private readonly db: PrismaService,
  ) {}

  private get headers() {
    const ua = this.config.get<string>('HH_USER_AGENT') ?? 'my-hr/1.0';
    return { 'User-Agent': ua, 'HH-User-Agent': ua };
  }

  async syncFromHh(candidateId: string, accessToken: string): Promise<void> {
    let resume: HhResumeSummary | null = null;
    try {
      const res = await firstValueFrom(
        this.http.get<{ items: HhResumeSummary[] }>(
          `${this.baseUrl}/resumes/mine`,
          {
            headers: {
              ...this.headers,
              Authorization: `Bearer ${accessToken}`,
            },
          },
        ),
      );
      resume = res.data.items?.[0] ?? null;
    } catch (err: any) {
      this.logger.warn(
        { candidateId, err: err.message },
        'resumes/mine fetch failed — skipping profile sync',
      );
      return;
    }

    if (!resume) {
      this.logger.log({ candidateId }, 'No HH resume found');
      return;
    }

    const yearsExp = resume.total_experience
      ? Math.round(resume.total_experience.months / 12)
      : undefined;

    const fullName =
      resume.first_name || resume.last_name
        ? [resume.first_name, resume.last_name].filter(Boolean).join(' ')
        : undefined;

    await this.db.candidate.update({
      where: { id: candidateId },
      data: {
        hhResumeId: resume.id,
        ...(fullName && { fullName }),
        ...(resume.title && { currentPosition: resume.title }),
        ...(resume.skill_set?.length && { skills: resume.skill_set }),
        ...(yearsExp !== undefined && { yearsExperience: yearsExp }),
        ...(resume.area?.name && { city: resume.area.name }),
      },
    });

    this.logger.log(
      { candidateId, hhResumeId: resume.id },
      'HH profile synced',
    );
  }

  /**
   * Create or update the candidate's resume on HH.
   * If hhResumeId already set → PUT (update); else → POST (create) and store the new ID.
   * Returns the HH resume ID.
   */
  async pushResumeToHh(
    candidateId: string,
    accessToken: string,
  ): Promise<string> {
    const candidate = await this.db.candidate.findUniqueOrThrow({
      where: { id: candidateId },
      select: {
        hhResumeId: true,
        currentPosition: true,
        skills: true,
        expectedSalaryUzs: true,
        expectedSalaryCurrency: true,
        city: true,
        rawResumeText: true,
      },
    });

    const ua = this.config.get<string>('HH_USER_AGENT') ?? 'my-hr/1.0';
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': ua,
      'HH-User-Agent': ua,
      'Content-Type': 'application/json',
    };

    const body: Record<string, unknown> = {
      area: { id: '97' },
      ...(candidate.currentPosition && { title: candidate.currentPosition }),
      ...(candidate.skills?.length && { skill_set: candidate.skills.slice(0, 30) }),
      ...(candidate.rawResumeText && {
        skills: candidate.rawResumeText.slice(0, 500),
      }),
    };

    if (candidate.expectedSalaryUzs) {
      body.salary = {
        amount: Number(candidate.expectedSalaryUzs),
        currency: candidate.expectedSalaryCurrency ?? 'UZS',
      };
    }

    if (candidate.hhResumeId) {
      await firstValueFrom(
        this.http.put(
          `${this.baseUrl}/resumes/${candidate.hhResumeId}`,
          body,
          { headers },
        ),
      );
      this.logger.log({ candidateId, hhResumeId: candidate.hhResumeId }, 'HH resume updated');
      return candidate.hhResumeId;
    }

    const response = await firstValueFrom(
      this.http.post(`${this.baseUrl}/resumes`, body, { headers }),
    );

    const location: string = response.headers['location'] ?? '';
    const hhResumeId = location.split('/').pop() ?? '';

    await this.db.candidate.update({
      where: { id: candidateId },
      data: { hhResumeId },
    });

    this.logger.log({ candidateId, hhResumeId }, 'HH resume created');
    return hhResumeId;
  }

  /** Publish (make visible to employers) the candidate's HH resume. */
  async publishResume(resumeId: string, accessToken: string): Promise<void> {
    const ua = this.config.get<string>('HH_USER_AGENT') ?? 'my-hr/1.0';
    await firstValueFrom(
      this.http.post(
        `${this.baseUrl}/resumes/${resumeId}/publish`,
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'User-Agent': ua,
            'HH-User-Agent': ua,
          },
        },
      ),
    );
    this.logger.log({ resumeId }, 'HH resume published');
  }
}
