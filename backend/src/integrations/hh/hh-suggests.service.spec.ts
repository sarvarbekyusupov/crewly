import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';
import { HhSuggestsService } from './hh-suggests.service';

describe('HhSuggestsService', () => {
  let service: HhSuggestsService;
  let httpGet: jest.Mock;

  const items = [
    { id: '1', text: 'Tashkent' },
    { id: '2', text: 'Samarkand' },
  ];

  beforeEach(async () => {
    httpGet = jest.fn().mockReturnValue(of({ data: { items } }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HhSuggestsService,
        { provide: HttpService, useValue: { get: httpGet } },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('crewly/1.0') },
        },
      ],
    }).compile();

    service = module.get(HhSuggestsService);
  });

  describe('areas', () => {
    it('returns suggest items for valid text', async () => {
      const result = await service.areas('Tash');
      expect(result).toEqual(items);
      expect(httpGet).toHaveBeenCalledWith(
        expect.stringContaining('/suggests/areas'),
        expect.objectContaining({ params: { text: 'Tash' } }),
      );
    });

    it('returns [] without calling API for empty string', async () => {
      const result = await service.areas('');
      expect(result).toEqual([]);
      expect(httpGet).not.toHaveBeenCalled();
    });

    it('returns [] without calling API for whitespace-only string', async () => {
      const result = await service.areas('   ');
      expect(result).toEqual([]);
      expect(httpGet).not.toHaveBeenCalled();
    });
  });

  describe('skills', () => {
    it('returns suggest items for valid text', async () => {
      const result = await service.skills('Node');
      expect(result).toEqual(items);
      expect(httpGet).toHaveBeenCalledWith(
        expect.stringContaining('/suggests/skill_set'),
        expect.objectContaining({ params: { text: 'Node' } }),
      );
    });

    it('returns [] for empty text', async () => {
      const result = await service.skills('');
      expect(result).toEqual([]);
      expect(httpGet).not.toHaveBeenCalled();
    });
  });

  describe('universities', () => {
    it('returns suggest items for valid text', async () => {
      const result = await service.universities('TUIT');
      expect(result).toEqual(items);
      expect(httpGet).toHaveBeenCalledWith(
        expect.stringContaining('/suggests/educational_institutions'),
        expect.objectContaining({ params: { text: 'TUIT' } }),
      );
    });

    it('returns [] for empty text', async () => {
      const result = await service.universities('');
      expect(result).toEqual([]);
      expect(httpGet).not.toHaveBeenCalled();
    });
  });
});
