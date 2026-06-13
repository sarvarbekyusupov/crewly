import { Injectable, Logger } from '@nestjs/common';
import { PromptRunnerService } from '../llm/prompt-runner.service';

interface CoverLetterInput {
  candidateName: string;
  currentPosition?: string;
  skills: string[];
  yearsExperience?: string;
  city?: string;
  jobTitle: string;
  company: string;
  jobDescription?: string;
  jobSkills: string[];
  candidateId: string;
}

@Injectable()
export class CoverLetterService {
  private readonly logger = new Logger(CoverLetterService.name);

  constructor(private readonly llm: PromptRunnerService) {}

  private sanitize(text: string | undefined | null, max = 200): string {
    if (!text) return '';
    return text
      .replace(/[\n\r<>{}]/g, ' ')
      .slice(0, max)
      .trim();
  }

  async generate(input: CoverLetterInput): Promise<string> {
    const prompt = `Write a concise, professional cover letter (max 200 words) for this job application.

Candidate:
- Name: ${this.sanitize(input.candidateName)}
- Current role: ${this.sanitize(input.currentPosition) || 'Not specified'}
- Experience: ${this.sanitize(input.yearsExperience) || 'Not specified'} years
- Location: ${this.sanitize(input.city) || 'Not specified'}
- Skills: ${input.skills
      .slice(0, 10)
      .map((s) => this.sanitize(s, 60))
      .join(', ')}

Job:
- Title: ${this.sanitize(input.jobTitle)}
- Company: ${this.sanitize(input.company)}
- Required skills: ${input.jobSkills
      .slice(0, 8)
      .map((s) => this.sanitize(s, 60))
      .join(', ')}
${input.jobDescription ? `- Description excerpt: ${this.sanitize(input.jobDescription, 500)}` : ''}

Write the cover letter body only (no "Dear Hiring Manager" header, no date). Keep it natural, specific, and under 200 words. Mention 2-3 relevant skills. Do not invent experience not in the profile.`;

    try {
      const { output } = await this.llm.run(
        'cover_letter',
        'v1',
        'cover_letter',
        [{ role: 'user', content: prompt }],
        { maxTokens: 512, temperature: 0.6 },
        {
          related_entity_type: 'candidate',
          related_entity_id: input.candidateId,
        },
      );
      return output.trim();
    } catch (err: any) {
      this.logger.warn(
        { error: err.message },
        'Cover letter generation failed — using template',
      );
      return this.fallback(input);
    }
  }

  private fallback(input: CoverLetterInput): string {
    return `I am writing to express my interest in the ${input.jobTitle} position at ${input.company}. With ${input.yearsExperience ?? 'several'} years of experience as a ${input.currentPosition ?? 'software professional'} and skills in ${input.skills.slice(0, 3).join(', ')}, I am confident I can contribute effectively to your team. I look forward to discussing this opportunity further.`;
  }
}
