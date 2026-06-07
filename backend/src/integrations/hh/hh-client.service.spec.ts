import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';
import { HhClientService } from './hh-client.service';

describe('HhClientService', () => {
  let service: HhClientService;
  let httpGet: jest.Mock;

  beforeEach(async () => {
    httpGet = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HhClientService,
        { provide: HttpService, useValue: { get: httpGet } },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('test-value') },
        },
      ],
    }).compile();

    service = module.get(HhClientService);
  });

  describe('searchResumes', () => {
    it('returns resume list from API', async () => {
      const data = { items: [{ id: 'ext-1' }], page: 0, pages: 1 };
      httpGet.mockReturnValue(of({ data }));

      const result = await service.searchResumes({ text: 'Node.js' });
      expect(result.items).toHaveLength(1);
    });
  });

  describe('getResume', () => {
    it('returns resume detail', async () => {
      const detail = { id: 'ext-1', first_name: 'Alice' };
      httpGet.mockReturnValue(of({ data: detail }));

      const result = await service.getResume('ext-1');
      expect(result.first_name).toBe('Alice');
    });

    it('throws HH_QUOTA_EXCEEDED on 403 api_access_payment', async () => {
      const err = Object.assign(new Error('Forbidden'), {
        response: {
          status: 403,
          data: { errors: [{ type: 'api_access_payment' }] },
        },
      });
      httpGet.mockImplementation(() => {
        throw err;
      });

      await expect(service.getResume('ext-1')).rejects.toMatchObject({
        code: 'HH_QUOTA_EXCEEDED',
      });
    });

    it('rethrows non-quota 403 errors unchanged', async () => {
      const err = Object.assign(new Error('Forbidden'), {
        response: { status: 403, data: { errors: [{ type: 'forbidden' }] } },
      });
      httpGet.mockImplementation(() => {
        throw err;
      });

      await expect(service.getResume('ext-1')).rejects.toThrow('Forbidden');
      await expect(service.getResume('ext-1')).rejects.not.toMatchObject({
        code: 'HH_QUOTA_EXCEEDED',
      });
    });
  });

  describe('extractResumeText', () => {
    const baseResume: any = {
      first_name: 'Alice',
      last_name: 'Smith',
      middle_name: undefined,
      title: 'Developer',
      area: { name: 'Tashkent' },
      salary: { amount: 5000000, currency: 'UZS' },
      total_experience: { months: 36 },
      skill_set: ['Node.js', 'TypeScript'],
      skills: 'Great developer',
      experience: [
        {
          position: 'Dev',
          company: 'Acme',
          start: '2020-01',
          end: null,
          description: 'Built things',
        },
      ],
      contact: [],
    };

    it('includes name, title, city, salary, experience, skills', () => {
      const text = service.extractResumeText(baseResume);
      expect(text).toContain('Alice Smith');
      expect(text).toContain('Developer');
      expect(text).toContain('Tashkent');
      expect(text).toContain('5000000 UZS');
      expect(text).toContain('3 лет');
      expect(text).toContain('Node.js');
      expect(text).toContain('Acme');
    });

    it('handles missing optional fields', () => {
      const minimal: any = { first_name: 'Bob', contact: [] };
      const text = service.extractResumeText(minimal);
      expect(text).toContain('Bob');
    });
  });

  describe('extractEmail', () => {
    it('returns email from contacts', () => {
      const resume: any = {
        contact: [{ type: { id: 'email' }, value: 'alice@example.com' }],
      };
      expect(service.extractEmail(resume)).toBe('alice@example.com');
    });

    it('returns undefined when no email contact', () => {
      const resume: any = { contact: [] };
      expect(service.extractEmail(resume)).toBeUndefined();
    });
  });

  describe('extractPhone', () => {
    it('returns formatted phone', () => {
      const resume: any = {
        contact: [
          { type: { id: 'cell' }, value: { formatted: '+998901234567' } },
        ],
      };
      expect(service.extractPhone(resume)).toBe('+998901234567');
    });

    it('returns undefined when no phone', () => {
      expect(service.extractPhone({ contact: [] } as any)).toBeUndefined();
    });
  });
});
