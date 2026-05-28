import { Test, TestingModule } from '@nestjs/testing';
import { LinkedInApplyService } from './linkedin-apply.service';

describe('LinkedInApplyService', () => {
  let service: LinkedInApplyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LinkedInApplyService],
    }).compile();
    service = module.get(LinkedInApplyService);
  });

  it('throws when playwright is not installed', async () => {
    jest.mock(
      'playwright',
      () => {
        throw new Error('Cannot find module playwright');
      },
      { virtual: true },
    );

    await expect(
      service.apply({
        jobUrl: 'https://linkedin.com/jobs/1234',
        candidateName: 'Alice',
        email: 'alice@example.com',
      }),
    ).rejects.toThrow('Playwright not installed');
  });
});
