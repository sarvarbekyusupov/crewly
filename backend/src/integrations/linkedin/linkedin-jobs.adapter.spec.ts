import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { LinkedInJobsAdapter } from './linkedin-jobs.adapter';

describe('LinkedInJobsAdapter', () => {
  let adapter: LinkedInJobsAdapter;
  let httpGet: jest.Mock;
  let configGet: jest.Mock;

  beforeEach(async () => {
    httpGet = jest.fn();
    configGet = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LinkedInJobsAdapter,
        { provide: HttpService, useValue: { get: httpGet } },
        { provide: ConfigService, useValue: { get: configGet } },
      ],
    }).compile();

    adapter = module.get(LinkedInJobsAdapter);
  });

  it('sourceName is linkedin', () => {
    expect(adapter.sourceName).toBe('linkedin');
  });

  it('returns empty when no API key', async () => {
    configGet.mockReturnValue('');
    const result = await adapter.fetchPage({
      query: 'engineer',
      location: 'NY',
      page: 0,
    });
    expect(result).toEqual({ jobs: [], hasMore: false });
    expect(httpGet).not.toHaveBeenCalled();
  });

  it('throws error on HTTP error', async () => {
    configGet.mockReturnValue('rapidapi-key');
    httpGet.mockReturnValue(throwError(() => new Error('Network error')));
    await expect(
      adapter.fetchPage({
        query: 'engineer',
        location: '',
        page: 0,
      }),
    ).rejects.toThrow('Network error');
  });

  it('returns empty when status not OK', async () => {
    configGet.mockReturnValue('rapidapi-key');
    httpGet.mockReturnValue(of({ data: { status: 'ERROR', data: [] } }));
    const result = await adapter.fetchPage({
      query: 'engineer',
      location: '',
      page: 0,
    });
    expect(result).toEqual({ jobs: [], hasMore: false });
  });

  it('returns empty when data is not an array', async () => {
    configGet.mockReturnValue('rapidapi-key');
    httpGet.mockReturnValue(of({ data: { status: 'OK', data: null } }));
    const result = await adapter.fetchPage({
      query: 'engineer',
      location: '',
      page: 0,
    });
    expect(result).toEqual({ jobs: [], hasMore: false });
  });

  it('normalizes jobs and hasMore false when fewer than 10', async () => {
    configGet.mockReturnValue('rapidapi-key');
    const job = {
      job_id: 'j1',
      job_title: 'Software Engineer',
      employer_name: 'Acme Corp',
      job_city: 'Tashkent',
      job_country: 'UZ',
      job_description: 'Build stuff',
      job_required_skills: ['TypeScript', 'NestJS'],
      job_employment_type: 'FULLTIME',
      job_is_remote: false,
      job_posted_at_datetime_utc: '2024-01-15T12:00:00Z',
      job_apply_link: 'https://acme.com/apply',
    };
    httpGet.mockReturnValue(of({ data: { status: 'OK', data: [job] } }));

    const result = await adapter.fetchPage({
      query: 'engineer',
      location: 'UZ',
      page: 0,
    });

    expect(result.hasMore).toBe(false);
    expect(result.jobs).toHaveLength(1);
    const normalized = result.jobs[0];
    expect(normalized.externalId).toBe('j1');
    expect(normalized.title).toBe('Software Engineer');
    expect(normalized.company).toBe('Acme Corp');
    expect(normalized.location).toBe('Tashkent, UZ');
    expect(normalized.skills).toEqual(['TypeScript', 'NestJS']);
    expect(normalized.employmentType).toBe('full-time');
    expect(normalized.workMode).toBe('office');
    expect(normalized.sourceUrl).toBe('https://acme.com/apply');
    expect(normalized.postedAt).toEqual(new Date('2024-01-15T12:00:00Z'));
  });

  it('hasMore true when 10 results returned', async () => {
    configGet.mockReturnValue('rapidapi-key');
    const jobs = Array.from({ length: 10 }, (_, i) => ({
      job_id: `j${i}`,
      job_title: 'Dev',
      employer_name: 'Corp',
    }));
    httpGet.mockReturnValue(of({ data: { status: 'OK', data: jobs } }));

    const result = await adapter.fetchPage({
      query: 'dev',
      location: '',
      page: 1,
    });
    expect(result.hasMore).toBe(true);
    expect(result.jobs).toHaveLength(10);
  });

  it('uses google link when apply link absent', async () => {
    configGet.mockReturnValue('rapidapi-key');
    const job = {
      job_id: 'j2',
      job_title: 'Backend Dev',
      employer_name: 'Corp',
      job_google_link: 'https://google.com/jobs/123',
    };
    httpGet.mockReturnValue(of({ data: { status: 'OK', data: [job] } }));

    const result = await adapter.fetchPage({
      query: 'backend',
      location: '',
      page: 0,
    });
    expect(result.jobs[0].sourceUrl).toBe('https://google.com/jobs/123');
  });

  it('falls back to keyword URL when no links', async () => {
    configGet.mockReturnValue('rapidapi-key');
    const job = {
      job_id: 'j3',
      job_title: 'QA Engineer',
      employer_name: 'Corp',
    };
    httpGet.mockReturnValue(of({ data: { status: 'OK', data: [job] } }));

    const result = await adapter.fetchPage({
      query: '',
      location: '',
      page: 0,
    });
    expect(result.jobs[0].sourceUrl).toContain('linkedin.com');
    expect(result.jobs[0].sourceUrl).toContain('QA%20Engineer');
  });

  it('sets workMode remote when job_is_remote true', async () => {
    configGet.mockReturnValue('rapidapi-key');
    const job = {
      job_id: 'j4',
      job_title: 'Remote Dev',
      employer_name: 'Corp',
      job_is_remote: true,
    };
    httpGet.mockReturnValue(of({ data: { status: 'OK', data: [job] } }));

    const result = await adapter.fetchPage({
      query: '',
      location: '',
      page: 0,
    });
    expect(result.jobs[0].workMode).toBe('remote');
  });

  it('maps employment types correctly', async () => {
    configGet.mockReturnValue('rapidapi-key');
    const types = [
      { input: 'PARTTIME', expected: 'part-time' },
      { input: 'CONTRACTOR', expected: 'contract' },
      { input: 'INTERN', expected: 'internship' },
      { input: 'UNKNOWN_TYPE', expected: 'full-time' },
    ];

    for (const { input, expected } of types) {
      const job = {
        job_id: 'jx',
        job_title: 'Dev',
        employer_name: 'Corp',
        job_employment_type: input,
      };
      httpGet.mockReturnValue(of({ data: { status: 'OK', data: [job] } }));
      const result = await adapter.fetchPage({
        query: '',
        location: '',
        page: 0,
      });
      expect(result.jobs[0].employmentType).toBe(expected);
    }
  });

  it('handles missing optional fields gracefully', async () => {
    configGet.mockReturnValue('rapidapi-key');
    const job = { job_id: 'j5', job_title: 'Dev', employer_name: 'Corp' };
    httpGet.mockReturnValue(of({ data: { status: 'OK', data: [job] } }));

    const result = await adapter.fetchPage({
      query: '',
      location: '',
      page: 0,
    });
    const normalized = result.jobs[0];
    expect(normalized.location).toBeUndefined();
    expect(normalized.skills).toEqual([]);
    expect(normalized.employmentType).toBeUndefined();
    expect(normalized.postedAt).toBeUndefined();
  });

  it('uses default query when both query and location are empty', async () => {
    configGet.mockReturnValue('rapidapi-key');
    httpGet.mockReturnValue(of({ data: { status: 'OK', data: [] } }));

    await adapter.fetchPage({ query: '', location: '', page: 0 });

    const callArgs = httpGet.mock.calls[0];
    expect(callArgs[1].params.query).toBe('software engineer');
  });

  it('combines query and location with "in"', async () => {
    configGet.mockReturnValue('rapidapi-key');
    httpGet.mockReturnValue(of({ data: { status: 'OK', data: [] } }));

    await adapter.fetchPage({
      query: 'backend',
      location: 'Tashkent',
      page: 0,
    });

    const callArgs = httpGet.mock.calls[0];
    expect(callArgs[1].params.query).toBe('backend in Tashkent');
  });
});
