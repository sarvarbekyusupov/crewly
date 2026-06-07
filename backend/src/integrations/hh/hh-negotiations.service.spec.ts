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
      HH_USER_AGENT: 'my-hr/1.0',
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
    it('returns employer states for vacancy', async () => {
      const states = [{ id: 'response', name: 'Неразобранные' }];
      httpGet.mockReturnValue(of({ data: { states } }));

      const result = await service.getVacancyCollections('vac-1');

      expect(result).toEqual(states);
      expect(httpGet).toHaveBeenCalledWith(
        expect.stringContaining('/negotiations/employer_states'),
        expect.objectContaining({ params: expect.objectContaining({ vacancy_id: 'vac-1' }) }),
      );
    });

    it('returns [] when states missing from response', async () => {
      httpGet.mockReturnValue(of({ data: {} }));
      const result = await service.getVacancyCollections('vac-1');
      expect(result).toEqual([]);
    });
  });

  describe('getVacancyResponses', () => {
    it('returns negotiation items with pagination', async () => {
      const payload = {
        items: [{ id: 'neg-1', state: { id: 'response' } }],
        pages: 2,
        page: 0,
      };
      httpGet.mockReturnValue(of({ data: payload }));

      const result = await service.getVacancyResponses('vac-1', { perPage: 50 });

      expect(result.items).toHaveLength(1);
      expect(result.pages).toBe(2);
      expect(httpGet).toHaveBeenCalledWith(
        expect.stringContaining('/negotiations'),
        expect.objectContaining({
          params: expect.objectContaining({ vacancy_id: 'vac-1', per_page: 50 }),
        }),
      );
    });
  });

  describe('inviteCandidate', () => {
    const actionUrl = 'https://api.hh.ru/negotiations/phone_interview';

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
      httpGet.mockReturnValue(
        of({ data: { items: [makeVacancyItem(true)] } }),
      );
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
                  { id: 'a', enabled: false, method: 'POST', url: 'https://api.hh.ru/negotiations/a', arguments: [] },
                  { id: 'b', enabled: true, method: 'POST', url: 'https://api.hh.ru/negotiations/b', arguments: [] },
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
        expect.objectContaining({ url: 'https://api.hh.ru/negotiations/b' }),
      );
    });

    it('throws when no enabled action found', async () => {
      httpGet.mockReturnValue(
        of({ data: { items: [makeVacancyItem(false)] } }),
      );

      await expect(
        service.inviteCandidate({ vacancyId: 'vac-1', resumeId: 'res-1', message: 'Hi' }),
      ).rejects.toThrow('No enabled invitation action found');
    });

    it('throws when vacancy not found in items', async () => {
      httpGet.mockReturnValue(of({ data: { items: [] } }));

      await expect(
        service.inviteCandidate({ vacancyId: 'vac-1', resumeId: 'res-1', message: 'Hi' }),
      ).rejects.toThrow('No enabled invitation action found');
    });
  });

  describe('moveNegotiation', () => {
    it('calls PUT on correct collection URL', async () => {
      httpPut.mockReturnValue(of({ data: {} }));

      await service.moveNegotiation('interview', 'neg-1', 'Congratulations');

      expect(httpPut).toHaveBeenCalledWith(
        'https://api.hh.ru/negotiations/interview/neg-1',
        { message: 'Congratulations' },
        expect.any(Object),
      );
    });

    it('omits message key when not provided', async () => {
      httpPut.mockReturnValue(of({ data: {} }));

      await service.moveNegotiation('discard', 'neg-1');

      expect(httpPut).toHaveBeenCalledWith(
        'https://api.hh.ru/negotiations/discard/neg-1',
        {},
        expect.any(Object),
      );
    });
  });

  describe('sendMessage', () => {
    it('posts message to negotiation thread', async () => {
      httpPost.mockReturnValue(of({ data: {} }));

      await service.sendMessage('neg-1', 'Hello candidate!');

      expect(httpPost).toHaveBeenCalledWith(
        'https://api.hh.ru/negotiations/neg-1/messages',
        { message: 'Hello candidate!' },
        expect.any(Object),
      );
    });
  });

  describe('getMessages', () => {
    it('returns message items from thread', async () => {
      const msgs = [
        { id: 'msg-1', text: 'Hi', created_at: '2024-01-01', author: { participant_type: 'employer' } },
      ];
      httpGet.mockReturnValue(of({ data: { items: msgs } }));

      const result = await service.getMessages('neg-1');

      expect(result).toEqual(msgs);
      expect(httpGet).toHaveBeenCalledWith(
        'https://api.hh.ru/negotiations/neg-1/messages',
        expect.any(Object),
      );
    });

    it('returns [] when items missing', async () => {
      httpGet.mockReturnValue(of({ data: {} }));
      const result = await service.getMessages('neg-1');
      expect(result).toEqual([]);
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
      const err = Object.assign(new Error('not found'), { response: { status: 404 } });
      httpGet.mockReturnValue({ pipe: () => { throw err; }, subscribe: () => { throw err; } });

      // Use throwError pattern
      httpGet.mockImplementation(() => { throw err; });

      await expect(service.getEmployerNegotiationState('neg-1')).rejects.toThrow();
    });
  });
});
