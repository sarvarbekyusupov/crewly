import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { HhApplyService } from './hh-apply.service';

describe('HhApplyService', () => {
  let service: HhApplyService;
  let httpPost: jest.Mock;
  let httpGet: jest.Mock;

  beforeEach(async () => {
    httpPost = jest.fn();
    httpGet = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HhApplyService,
        { provide: HttpService, useValue: { post: httpPost, get: httpGet } },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('Crewly/1.0') },
        },
      ],
    }).compile();

    service = module.get(HhApplyService);
  });

  describe('apply', () => {
    it('returns negotiation ID from location header', async () => {
      httpPost.mockReturnValue(
        of({
          status: 201,
          headers: { location: 'https://api.hh.ru/negotiations/neg-123' },
          data: {},
        }),
      );

      const result = await service.apply({
        vacancyId: 'vac-1',
        hhOauthToken: 'token',
        hhResumeId: 'resume-1',
        coverLetter: 'Dear hiring manager...',
      });

      expect(result).toEqual({ negotiationId: 'neg-123' });
    });

    it('returns empty string as id when no location header', async () => {
      httpPost.mockReturnValue(of({ status: 201, headers: {}, data: {} }));
      const result = await service.apply({
        vacancyId: 'v-1',
        hhOauthToken: 'tok',
        hhResumeId: 'r-1',
      });
      expect(result.negotiationId).toBeDefined();
    });
  });

  describe('getResumeId', () => {
    it('returns first resume ID', async () => {
      httpGet.mockReturnValue(
        of({ data: { items: [{ id: 'resume-1', title: 'My Resume' }] } }),
      );
      const result = await service.getResumeId('token');
      expect(result).toBe('resume-1');
    });

    it('returns null when no resumes', async () => {
      httpGet.mockReturnValue(of({ data: { items: [] } }));
      const result = await service.getResumeId('token');
      expect(result).toBeNull();
    });

    it('returns null on API error', async () => {
      httpGet.mockReturnValue(throwError(() => new Error('401')));
      const result = await service.getResumeId('bad-token');
      expect(result).toBeNull();
    });
  });
});
