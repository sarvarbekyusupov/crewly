import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { HhJobsAdapter } from './hh-jobs.adapter';

const makeVacancy = (overrides: any = {}): any => ({
  id: 'vac-1',
  name: 'Node.js Developer',
  alternate_url: 'https://hh.ru/vacancy/1',
  employer: { name: 'Acme Corp' },
  area: { name: 'Tashkent' },
  salary: null,
  snippet: { responsibility: 'Build APIs', requirement: 'Node.js 5yr' },
  key_skills: [{ name: 'Node.js' }, { name: 'TypeScript' }],
  employment: { name: 'Полная занятость' },
  schedule: { name: 'Удаленная работа' },
  published_at: '2026-05-01T00:00:00',
  ...overrides,
});

describe('HhJobsAdapter', () => {
  let adapter: HhJobsAdapter;
  let httpGet: jest.Mock;

  beforeEach(async () => {
    httpGet = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HhJobsAdapter,
        { provide: HttpService, useValue: { get: httpGet } },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('my-hr/1.0') },
        },
      ],
    }).compile();

    adapter = module.get(HhJobsAdapter);
  });

  it('sourceName is hh.ru', () => {
    expect(adapter.sourceName).toBe('hh.ru');
  });

  it('returns jobs from API response', async () => {
    httpGet.mockReturnValue(
      of({
        data: { items: [makeVacancy()], page: 0, pages: 1 },
      }),
    );

    const result = await adapter.fetchPage({ page: 0, query: 'Node.js' });
    expect(result.jobs).toHaveLength(1);
    expect(result.jobs[0]).toMatchObject({
      externalId: 'vac-1',
      title: 'Node.js Developer',
      company: 'Acme Corp',
      location: 'Tashkent',
      workMode: 'remote',
      employmentType: 'full-time',
      skills: ['Node.js', 'TypeScript'],
    });
    expect(result.hasMore).toBe(false);
  });

  it('throws error on API error', async () => {
    httpGet.mockReturnValue(throwError(() => new Error('Network error')));
    await expect(adapter.fetchPage({ page: 0 })).rejects.toThrow('Network error');
  });

  it('hasMore is true when more pages available', async () => {
    httpGet.mockReturnValue(of({ data: { items: [], page: 0, pages: 3 } }));
    const result = await adapter.fetchPage({ page: 0 });
    expect(result.hasMore).toBe(true);
  });

  it('maps UZS salary to BigInt', async () => {
    httpGet.mockReturnValue(
      of({
        data: {
          items: [
            makeVacancy({
              salary: { currency: 'UZS', from: 5000000, to: 10000000 },
            }),
          ],
          page: 0,
          pages: 1,
        },
      }),
    );

    const result = await adapter.fetchPage({ page: 0 });
    expect(result.jobs[0].salaryMinUzs).toBe(BigInt(5000000));
    expect(result.jobs[0].salaryMaxUzs).toBe(BigInt(10000000));
  });

  it('maps hybrid schedule', async () => {
    httpGet.mockReturnValue(
      of({
        data: {
          items: [makeVacancy({ schedule: { name: 'Гибкий график' } })],
          page: 0,
          pages: 1,
        },
      }),
    );
    const result = await adapter.fetchPage({ page: 0 });
    expect(result.jobs[0].workMode).toBe('hybrid');
  });

  it('maps office schedule for unrecognized schedule', async () => {
    httpGet.mockReturnValue(
      of({
        data: {
          items: [makeVacancy({ schedule: { name: 'Unknown' } })],
          page: 0,
          pages: 1,
        },
      }),
    );
    const result = await adapter.fetchPage({ page: 0 });
    expect(result.jobs[0].workMode).toBe('office');
  });
});
