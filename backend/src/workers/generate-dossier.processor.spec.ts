import { Test, TestingModule } from '@nestjs/testing';
import { GenerateDossierProcessor } from './generate-dossier.processor';
import { PrismaService } from '../prisma/prisma.service';
import { PromptRunnerService } from '../integrations/llm/prompt-runner.service';
import { S3Service } from '../integrations/storage/s3.service';
import { NonRetryableError } from './errors';

const makeJob = (data: object, opts = {}) =>
  ({ data, opts: { attempts: 3, ...opts }, attemptsMade: 0 }) as any;

describe('GenerateDossierProcessor', () => {
  let processor: GenerateDossierProcessor;
  let db: any;
  let llm: { run: jest.Mock };
  let s3: { upload: jest.Mock };

  const screeningId = 'screening-1';

  beforeEach(async () => {
    db = {
      screening: {
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
      application: { update: jest.fn().mockResolvedValue({}) },
    };
    llm = { run: jest.fn() };
    s3 = { upload: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GenerateDossierProcessor,
        { provide: PrismaService, useValue: db },
        { provide: PromptRunnerService, useValue: llm },
        { provide: S3Service, useValue: s3 },
      ],
    }).compile();

    processor = module.get(GenerateDossierProcessor);
  });

  it('throws NonRetryableError when screening not found', async () => {
    db.screening.findUnique.mockResolvedValue(null);
    await expect(processor.handle(makeJob({ screeningId }))).rejects.toThrow(
      NonRetryableError,
    );
  });

  it('generates dossier, uploads to S3, and marks application as delivered', async () => {
    db.screening.findUnique.mockResolvedValue({
      id: screeningId,
      applicationId: 'app-1',
      aiAssessment: { technical_score: 8 },
      application: {
        job: { id: 'job-1', title: 'Dev', companyId: 'co1' },
        candidate: {
          fullName: 'Alice',
          yearsExperience: 5,
          skills: ['TypeScript'],
        },
      },
    });
    llm.run.mockResolvedValue({ output: 'Dossier content here...' });
    s3.upload.mockResolvedValue(
      'https://s3.example.com/dossiers/app-1/screening-1.txt',
    );

    const result = await processor.handle(makeJob({ screeningId }));

    expect(llm.run).toHaveBeenCalled();
    expect(s3.upload).toHaveBeenCalledWith(
      expect.stringContaining('dossiers/'),
      'Dossier content here...',
      'text/plain; charset=utf-8',
    );
    expect(db.screening.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          aiAssessment: expect.objectContaining({
            dossierUrl: expect.any(String),
          }),
        }),
      }),
    );
    expect(db.application.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'delivered' }),
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({ dossier: 'Dossier content here...' }),
    );
  });
});
