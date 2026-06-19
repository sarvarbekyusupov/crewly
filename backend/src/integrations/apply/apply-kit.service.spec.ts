import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ApplyKitService } from './apply-kit.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CoverLetterService } from './cover-letter.service';

const mockCandidate = {
  fullName: 'Alice Karimova',
  currentPosition: 'Frontend Engineer',
  yearsExperience: 3,
  city: 'Tashkent',
  skills: ['TypeScript', 'React', 'CSS'],
  email: 'alice@example.com',
  phone: '+998901234567',
  languages: ['English', 'Russian'],
  rawResumeText: 'Experienced frontend engineer...',
};

const mockHhJob = {
  source: 'hh.ru',
  externalId: 'HH_VAC_123',
  sourceUrl: 'https://hh.uz/vacancy/HH_VAC_123',
  title: 'Frontend Developer',
  company: 'Acme Corp',
  description: 'Build scalable UIs',
  skills: ['TypeScript', 'Vue'],
};

const mockTelegramJob = {
  source: 'telegram_channel',
  externalId: null,
  sourceUrl: 'https://t.me/uzjobs/456',
  title: 'Full Stack Developer',
  company: 'Startup Inc',
  description: 'Build products',
  skills: ['Node.js', 'React'],
};

describe('ApplyKitService', () => {
  let service: ApplyKitService;
  let mockDb: {
    candidate: { findUnique: jest.Mock };
    discoveredJob: { findUnique: jest.Mock };
  };
  let mockCoverLetter: { generate: jest.Mock };

  beforeEach(async () => {
    mockDb = {
      candidate: { findUnique: jest.fn() },
      discoveredJob: { findUnique: jest.fn() },
    };
    mockCoverLetter = {
      generate: jest.fn().mockResolvedValue('Generated cover letter'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplyKitService,
        { provide: PrismaService, useValue: mockDb },
        { provide: CoverLetterService, useValue: mockCoverLetter },
      ],
    }).compile();

    service = module.get(ApplyKitService);
  });

  describe('build()', () => {
    it('throws NotFoundException when candidate not found', async () => {
      mockDb.candidate.findUnique.mockResolvedValue(null);
      mockDb.discoveredJob.findUnique.mockResolvedValue(mockHhJob);

      await expect(service.build('cand-1', 'job-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when discoveredJob not found', async () => {
      mockDb.candidate.findUnique.mockResolvedValue(mockCandidate);
      mockDb.discoveredJob.findUnique.mockResolvedValue(null);

      await expect(service.build('cand-1', 'job-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('builds HH apply URL from externalId', async () => {
      mockDb.candidate.findUnique.mockResolvedValue(mockCandidate);
      mockDb.discoveredJob.findUnique.mockResolvedValue(mockHhJob);

      const kit = await service.build('cand-1', 'job-1');

      expect(kit.applyUrl).toBe('https://hh.uz/vacancy/HH_VAC_123');
    });

    it('uses sourceUrl for Telegram channel jobs', async () => {
      mockDb.candidate.findUnique.mockResolvedValue(mockCandidate);
      mockDb.discoveredJob.findUnique.mockResolvedValue(mockTelegramJob);

      const kit = await service.build('cand-1', 'job-1');

      expect(kit.applyUrl).toBe('https://t.me/uzjobs/456');
    });

    it('returns cover letter from CoverLetterService', async () => {
      mockDb.candidate.findUnique.mockResolvedValue(mockCandidate);
      mockDb.discoveredJob.findUnique.mockResolvedValue(mockHhJob);
      mockCoverLetter.generate.mockResolvedValue('My tailored cover letter');

      const kit = await service.build('cand-1', 'job-1');

      expect(kit.coverLetter).toBe('My tailored cover letter');
    });

    it('prioritizes job-matching skills in CV text', async () => {
      mockDb.candidate.findUnique.mockResolvedValue(mockCandidate);
      // job requires TypeScript + Vue; candidate has TypeScript, React, CSS
      mockDb.discoveredJob.findUnique.mockResolvedValue(mockHhJob);

      const kit = await service.build('cand-1', 'job-1');

      // TypeScript matches → appears before React (no match)
      const tsIdx = kit.tailoredCvText.indexOf('TypeScript');
      const reactIdx = kit.tailoredCvText.indexOf('React');
      expect(tsIdx).toBeGreaterThanOrEqual(0);
      expect(reactIdx).toBeGreaterThanOrEqual(0);
      expect(tsIdx).toBeLessThan(reactIdx);
    });

    it('includes step-by-step instructions', async () => {
      mockDb.candidate.findUnique.mockResolvedValue(mockCandidate);
      mockDb.discoveredJob.findUnique.mockResolvedValue(mockHhJob);

      const kit = await service.build('cand-1', 'job-1');

      expect(kit.instructions).toContain('1.');
    });

    it('passes candidateId to CoverLetterService', async () => {
      mockDb.candidate.findUnique.mockResolvedValue(mockCandidate);
      mockDb.discoveredJob.findUnique.mockResolvedValue(mockHhJob);

      await service.build('cand-42', 'job-1');

      expect(mockCoverLetter.generate).toHaveBeenCalledWith(
        expect.objectContaining({ candidateId: 'cand-42' }),
      );
    });
  });
});
