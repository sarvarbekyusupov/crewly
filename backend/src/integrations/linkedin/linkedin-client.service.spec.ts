import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';
import { LinkedInAdapter } from './linkedin-client.service';

describe('LinkedInAdapter', () => {
  let adapter: LinkedInAdapter;
  let httpGet: jest.Mock;
  let configGet: jest.Mock;

  beforeEach(async () => {
    httpGet = jest.fn();
    configGet = jest.fn((key: string) => {
      if (key === 'LINKEDIN_RAPIDAPI_KEY') return 'test-key';
      if (key === 'LINKEDIN_RAPIDAPI_HOST') return 'test-host.rapidapi.com';
      return undefined;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LinkedInAdapter,
        { provide: HttpService, useValue: { get: httpGet } },
        { provide: ConfigService, useValue: { get: configGet } },
      ],
    }).compile();

    adapter = module.get(LinkedInAdapter);
  });

  it('sourceName is linkedin', () => {
    expect(adapter.sourceName).toBe('linkedin');
  });

  it('throws when API key not configured', async () => {
    configGet.mockImplementation(() => '');
    const module = await Test.createTestingModule({
      providers: [
        LinkedInAdapter,
        { provide: HttpService, useValue: { get: httpGet } },
        { provide: ConfigService, useValue: { get: configGet } },
      ],
    }).compile();
    const svc = module.get(LinkedInAdapter);
    await expect(svc.fetchPage({ page: 0 })).rejects.toThrow(
      'LINKEDIN_RAPIDAPI_KEY not configured',
    );
  });

  it('returns empty profiles when API returns no results', async () => {
    httpGet.mockReturnValue(
      of({ data: { success: false, message: 'No results', data: null } }),
    );
    const result = await adapter.fetchPage({ page: 0 });
    expect(result.profiles).toHaveLength(0);
    expect(result.hasMore).toBe(false);
  });

  it('normalizes profiles from API response', async () => {
    const profile = {
      full_name: 'Alice Smith',
      profile_id: 'alice-smith',
      linkedin_url: 'https://linkedin.com/in/alice-smith',
      email: 'alice@example.com',
      phone: '+1234567890',
      headline: 'Senior Developer',
      location: 'Tashkent',
      city: 'Tashkent',
      summary: 'Great dev',
      skills: ['Node.js', 'TypeScript'],
      experiences: [
        {
          title: 'Dev',
          company: 'Acme',
          starts_at: { year: 2020 },
          ends_at: null,
          description: 'Built stuff',
        },
      ],
      educations: [{ degree_name: 'BSc', field_of_study: 'CS', school: 'MIT' }],
    };
    httpGet.mockReturnValue(of({ data: { success: true, data: [profile] } }));

    const result = await adapter.fetchPage({ page: 0 });
    expect(result.profiles).toHaveLength(1);
    expect(result.profiles[0]).toMatchObject({
      externalId: 'alice-smith',
      fullName: 'Alice Smith',
      email: 'alice@example.com',
      city: 'Tashkent',
    });
    expect(result.profiles[0].rawText).toContain('Alice Smith');
    expect(result.profiles[0].rawText).toContain('Node.js');
    expect(result.profiles[0].rawText).toContain('Acme');
    expect(result.profiles[0].rawText).toContain('MIT');
  });

  it('sets hasMore to true when page has 10+ profiles', async () => {
    const profiles = Array.from({ length: 10 }, (_, i) => ({
      full_name: `User ${i}`,
      linkedin_url: `https://linkedin.com/in/user-${i}`,
    }));
    httpGet.mockReturnValue(of({ data: { success: true, data: profiles } }));

    const result = await adapter.fetchPage({ page: 0 });
    expect(result.hasMore).toBe(true);
  });

  it('extracts profile_id from linkedin_url when not present', async () => {
    const profile = {
      linkedin_url: 'https://linkedin.com/in/john-doe',
      full_name: 'John Doe',
    };
    httpGet.mockReturnValue(of({ data: { success: true, data: [profile] } }));

    const result = await adapter.fetchPage({ page: 0 });
    expect(result.profiles[0].externalId).toBe('john-doe');
  });
});
