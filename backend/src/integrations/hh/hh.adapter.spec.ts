import { Test, TestingModule } from '@nestjs/testing';
import { HhAdapter } from './hh.adapter';
import { HhClientService } from './hh-client.service';

const makeDetail = (overrides: any = {}) => ({
  id: 'ext-1',
  first_name: 'Alice',
  last_name: 'Smith',
  area: { name: 'Tashkent' },
  salary: null,
  contact: [],
  experience: [],
  education: { primary: [] },
  skill_set: [],
  skills: '',
  ...overrides,
});

describe('HhAdapter', () => {
  let adapter: HhAdapter;
  let hh: {
    searchResumes: jest.Mock;
    getResume: jest.Mock;
    extractEmail: jest.Mock;
    extractPhone: jest.Mock;
    extractResumeText: jest.Mock;
  };

  beforeAll(() => {
    jest.spyOn(global, 'setTimeout').mockImplementation((fn: any) => {
      fn();
      return 0 as any;
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(async () => {
    hh = {
      searchResumes: jest.fn(),
      getResume: jest.fn(),
      extractEmail: jest.fn().mockReturnValue('alice@example.com'),
      extractPhone: jest.fn().mockReturnValue('+998901234567'),
      extractResumeText: jest.fn().mockReturnValue('resume text'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [HhAdapter, { provide: HhClientService, useValue: hh }],
    }).compile();

    adapter = module.get(HhAdapter);
  });

  it('sourceName is hh.ru', () => {
    expect(adapter.sourceName).toBe('hh.ru');
  });

  it('fetchPage returns normalized profiles', async () => {
    hh.searchResumes.mockResolvedValue({
      items: [{ id: 'ext-1', url: 'https://hh.ru/1' }],
      page: 0,
      pages: 1,
    });
    hh.getResume.mockResolvedValue(makeDetail());

    const result = await adapter.fetchPage({ page: 0 });

    expect(result.profiles).toHaveLength(1);
    expect(result.profiles[0]).toMatchObject({
      externalId: 'ext-1',
      fullName: 'Alice Smith',
      email: 'alice@example.com',
    });
    expect(result.hasMore).toBe(false);
  });

  it('skips profiles when getResume fails', async () => {
    hh.searchResumes.mockResolvedValue({
      items: [{ id: 'ext-1', url: 'https://hh.ru/1' }],
      page: 0,
      pages: 1,
    });
    hh.getResume.mockRejectedValue(new Error('403 Forbidden'));

    const result = await adapter.fetchPage({ page: 0 });
    expect(result.profiles).toHaveLength(0);
  });

  it('hasMore is true when more pages available', async () => {
    hh.searchResumes.mockResolvedValue({ items: [], page: 0, pages: 3 });
    const result = await adapter.fetchPage({ page: 0 });
    expect(result.hasMore).toBe(true);
  });

  it('extracts UZS salary when currency is UZS', async () => {
    hh.searchResumes.mockResolvedValue({
      items: [{ id: 'ext-1', url: 'https://hh.ru/1' }],
      page: 0,
      pages: 1,
    });
    hh.getResume.mockResolvedValue(
      makeDetail({ salary: { currency: 'UZS', amount: 5000000 } }),
    );

    const result = await adapter.fetchPage({ page: 0 });
    expect(result.profiles[0].expectedSalaryUzs).toBe(BigInt(5000000));
  });
});
