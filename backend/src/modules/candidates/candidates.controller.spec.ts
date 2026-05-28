import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CandidatesController } from './candidates.controller';
import { CandidatesService } from './candidates.service';
import { AuthGuard } from '../../common/guards/auth.guard';

describe('CandidatesController', () => {
  let controller: CandidatesController;
  let svc: {
    findAll: jest.Mock;
    findOne: jest.Mock;
    getOutreachHistory: jest.Mock;
    uploadResume: jest.Mock;
  };

  const user = { id: 'user-1', companyId: 'company-1' };

  beforeEach(async () => {
    svc = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      getOutreachHistory: jest.fn(),
      uploadResume: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CandidatesController],
      providers: [{ provide: CandidatesService, useValue: svc }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(CandidatesController);
  });

  it('findAll delegates with parsed params', () => {
    svc.findAll.mockResolvedValue({ data: [] });
    controller.findAll(user, 'Alice', '2', '10', 'score');
    expect(svc.findAll).toHaveBeenCalledWith('company-1', {
      search: 'Alice',
      page: 2,
      limit: 10,
      sortBy: 'score',
    });
  });

  it('findOne delegates to service', () => {
    svc.findOne.mockResolvedValue({ id: 'cand-1' });
    controller.findOne(user, 'cand-1');
    expect(svc.findOne).toHaveBeenCalledWith('company-1', 'cand-1');
  });

  it('getOutreachHistory delegates to service', () => {
    svc.getOutreachHistory.mockResolvedValue([]);
    controller.getOutreachHistory(user, 'cand-1');
    expect(svc.getOutreachHistory).toHaveBeenCalledWith('company-1', 'cand-1');
  });

  describe('uploadResume', () => {
    it('throws BadRequestException when no file', async () => {
      await expect(
        controller.uploadResume(user, 'cand-1', undefined as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException for disallowed mime type', async () => {
      const file = {
        mimetype: 'image/png',
        buffer: Buffer.from(''),
        originalname: 'photo.png',
      } as any;
      await expect(
        controller.uploadResume(user, 'cand-1', file),
      ).rejects.toThrow(BadRequestException);
    });

    it('delegates PDF upload to service', async () => {
      const file = {
        mimetype: 'application/pdf',
        buffer: Buffer.from('data'),
        originalname: 'cv.pdf',
      } as any;
      svc.uploadResume.mockResolvedValue({ url: 'https://signed.url' });

      const result = await controller.uploadResume(user, 'cand-1', file);
      expect(svc.uploadResume).toHaveBeenCalledWith(
        'company-1',
        'cand-1',
        file.buffer,
        'cv.pdf',
        'application/pdf',
      );
      expect(result).toEqual({ url: 'https://signed.url' });
    });
  });
});
