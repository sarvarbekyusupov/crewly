import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';
import { HhNegotiationsService } from './hh-negotiations.service';

describe('HhNegotiationsService', () => {
  let service: HhNegotiationsService;
  let httpGet: jest.Mock;
  let httpPost: jest.Mock;
  let httpPut: jest.Mock;
  let httpRequest: jest.Mock;

  const configGet = jest.fn((key: string) => {
    const map: Record<string, string> = {
      HH_EMPLOYER_TOKEN: 'emp-token',
      HH_EMPLOYER_ID: 'emp-123',
      HH_USER_AGENT: 'crewly/1.0',
    };
    return map[key] ?? '';
  });

  beforeEach(async () => {
    httpGet = jest.fn();
    httpPost = jest.fn();
    httpPut = jest.fn();
    httpRequest = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HhNegotiationsService,
        {
          provide: HttpService,
          useValue: {
            get: httpGet,
            post: httpPost,
            put: httpPut,
            request: httpRequest,
          },
        },
        { provide: ConfigService, useValue: { get: configGet } },
      ],
    }).compile();

    service = module.get(HhNegotiationsService);
  });

  describe('getVacancyCollections', () => {
    it('extracts states from GET /negotiations response', async () => {
      const states = [{ id: 'response', name: 'Неразобранные' }];
      httpGet.mockReturnValue(of({ data: { states, collections: [] } }));

      const result = await service.getVacancyCollections('vac-1');

      expect(result).toEqual(states);
      // Must hit /negotiations not the non-existent /negotiations/employer_states
      expect(httpGet).toHaveBeenCalledWith(
        'https://api.hh.uz/negotiations',
        expect.objectContaining({
          params: expect.objectContaining({ vacancy_id: 'vac-1' }),
        }),
      );
    });

    it('returns [] when states absent from response', async () => {
      httpGet.mockReturnValue(of({ data: { collections: [] } }));
      const result = await service.getVacancyCollections('vac-1');
      expect(result).toEqual([]);
    });
  });

  describe('getVacancyResponses', () => {
    const collectionUrl =
      'https://api.hh.uz/negotiations/response?vacancy_id=vac-1';
    const negotiationItems = [{ id: 'neg-1', state: { id: 'response' } }];

    it('fetches collections then items from each collection URL', async () => {
      httpGet
        .mockReturnValueOnce(
          of({
            data: { collections: [{ id: 'response', url: collectionUrl }] },
          }),
        )
        .mockReturnValueOnce(of({ data: { items: negotiationItems } }));

      const result = await service.getVacancyResponses('vac-1', {
        perPage: 50,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('neg-1');
      // First call: get collections
      expect(httpGet).toHaveBeenNthCalledWith(
        1,
        'https://api.hh.uz/negotiations',
        expect.objectContaining({ params: { vacancy_id: 'vac-1' } }),
      );
      // Second call: get items from collection URL
      expect(httpGet).toHaveBeenNthCalledWith(
        2,
        collectionUrl,
        expect.objectContaining({ params: { per_page: 50 } }),
      );
    });

    it('returns empty items when no collections', async () => {
      httpGet.mockReturnValue(of({ data: { collections: [] } }));
      const result = await service.getVacancyResponses('vac-1');
      expect(result.items).toEqual([]);
      expect(httpGet).toHaveBeenCalledTimes(1);
    });

    it('combines items from multiple collections', async () => {
      const url1 = 'https://api.hh.uz/negotiations/response?vacancy_id=vac-1';
      const url2 = 'https://api.hh.uz/negotiations/interview?vacancy_id=vac-1';
      httpGet
        .mockReturnValueOnce(
          of({
            data: {
              collections: [
                { id: 'response', url: url1 },
                { id: 'interview', url: url2 },
              ],
            },
          }),
        )
        .mockReturnValueOnce(of({ data: { items: [{ id: 'neg-1' }] } }))
        .mockReturnValueOnce(of({ data: { items: [{ id: 'neg-2' }] } }));

      const result = await service.getVacancyResponses('vac-1');
      expect(result.items).toHaveLength(2);
    });

    it('skips failed collection fetches and returns others', async () => {
      httpGet
        .mockReturnValueOnce(
          of({
            data: { collections: [{ id: 'response', url: collectionUrl }] },
          }),
        )
        .mockImplementationOnce(() => {
          throw new Error('network error');
        });

      const result = await service.getVacancyResponses('vac-1');
      expect(result.items).toEqual([]);
    });
  });

  describe('inviteCandidate', () => {
    const actionUrl = 'https://api.hh.uz/negotiations/phone_interview';

    const makeVacancyItem = (enabled: boolean) => ({
      id: 'vac-1',
      negotiations_actions: [
        {
          id: 'phone_interview',
          enabled,
          method: 'POST',
          url: actionUrl,
          arguments: [],
        },
      ],
    });

    it('fetches available actions then executes first enabled action', async () => {
      httpGet.mockReturnValue(of({ data: { items: [makeVacancyItem(true)] } }));
      httpRequest.mockReturnValue(
        of({ headers: { location: '/negotiations/new-neg-id' }, data: {} }),
      );

      const result = await service.inviteCandidate({
        vacancyId: 'vac-1',
        resumeId: 'res-1',
        message: 'Hello',
      });

      expect(result).toBe('new-neg-id');
      expect(httpGet).toHaveBeenCalledWith(
        expect.stringContaining('/employers/emp-123/vacancies/active'),
        expect.objectContaining({ params: { resume_id: 'res-1' } }),
      );
      expect(httpRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: actionUrl,
          params: expect.objectContaining({
            vacancy_id: 'vac-1',
            resume_id: 'res-1',
            message: 'Hello',
          }),
        }),
      );
    });

    it('skips disabled actions and uses first enabled', async () => {
      httpGet.mockReturnValue(
        of({
          data: {
            items: [
              {
                id: 'vac-1',
                negotiations_actions: [
                  {
                    id: 'a',
                    enabled: false,
                    method: 'POST',
                    url: 'https://api.hh.uz/negotiations/a',
                    arguments: [],
                  },
                  {
                    id: 'b',
                    enabled: true,
                    method: 'POST',
                    url: 'https://api.hh.uz/negotiations/b',
                    arguments: [],
                  },
                ],
              },
            ],
          },
        }),
      );
      httpRequest.mockReturnValue(
        of({ headers: { location: '/negotiations/neg-b' }, data: {} }),
      );

      const result = await service.inviteCandidate({
        vacancyId: 'vac-1',
        resumeId: 'res-1',
        message: 'Hi',
      });

      expect(result).toBe('neg-b');
      expect(httpRequest).toHaveBeenCalledWith(
        expect.objectContaining({ url: 'https://api.hh.uz/negotiations/b' }),
      );
    });

    it('throws when no enabled action found', async () => {
      httpGet.mockReturnValue(
        of({ data: { items: [makeVacancyItem(false)] } }),
      );

      await expect(
        service.inviteCandidate({
          vacancyId: 'vac-1',
          resumeId: 'res-1',
          message: 'Hi',
        }),
      ).rejects.toThrow('No enabled invitation action found');
    });

    it('throws when vacancy not found in items', async () => {
      httpGet.mockReturnValue(of({ data: { items: [] } }));

      await expect(
        service.inviteCandidate({
          vacancyId: 'vac-1',
          resumeId: 'res-1',
          message: 'Hi',
        }),
      ).rejects.toThrow('No enabled invitation action found');
    });
  });

  describe('moveNegotiation', () => {
    it('calls PUT on correct collection URL', async () => {
      httpPut.mockReturnValue(of({ data: {} }));

      await service.moveNegotiation('interview', 'neg-1', 'Congratulations');

      expect(httpPut).toHaveBeenCalledWith(
        'https://api.hh.uz/negotiations/interview/neg-1',
        { message: 'Congratulations' },
        expect.any(Object),
      );
    });

    it('omits message key when not provided', async () => {
      httpPut.mockReturnValue(of({ data: {} }));

      await service.moveNegotiation('discard', 'neg-1');

      expect(httpPut).toHaveBeenCalledWith(
        'https://api.hh.uz/negotiations/discard/neg-1',
        {},
        expect.any(Object),
      );
    });
  });

  describe('sendMessage', () => {
    it('throws deprecated error', async () => {
      await expect(service.sendMessage('neg-1', 'Hello')).rejects.toThrow(
        'HH Negotiations messages API is deprecated',
      );
    });
  });

  describe('getMessages', () => {
    it('throws deprecated error', async () => {
      await expect(service.getMessages('neg-1')).rejects.toThrow(
        'HH Negotiations messages API is deprecated',
      );
    });
  });

  describe('getEmployerNegotiationState', () => {
    it('returns state id when present', async () => {
      httpGet.mockReturnValue(of({ data: { state: { id: 'interview' } } }));
      const result = await service.getEmployerNegotiationState('neg-1');
      expect(result).toBe('interview');
    });

    it('returns null when state absent', async () => {
      httpGet.mockReturnValue(of({ data: {} }));
      const result = await service.getEmployerNegotiationState('neg-1');
      expect(result).toBeNull();
    });

    it('rethrows 404 errors', async () => {
      const err = Object.assign(new Error('not found'), {
        response: { status: 404 },
      });
      httpGet.mockReturnValue({
        pipe: () => {
          throw err;
        },
        subscribe: () => {
          throw err;
        },
      });

      // Use throwError pattern
      httpGet.mockImplementation(() => {
        throw err;
      });

      await expect(
        service.getEmployerNegotiationState('neg-1'),
      ).rejects.toThrow();
    });
  });
});
