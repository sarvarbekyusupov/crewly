import { Test, TestingModule } from '@nestjs/testing';
import { LlmCallsController } from './llm-calls.controller';
import { LlmCallsService } from './llm-calls.service';
import { StaffGuard } from '../../common/guards/staff.guard';

describe('LlmCallsController', () => {
  let controller: LlmCallsController;
  let svc: { findAll: jest.Mock; summary: jest.Mock; findOne: jest.Mock };

  beforeEach(async () => {
    svc = {
      findAll: jest.fn().mockResolvedValue({ data: [], total: 0 }),
      summary: jest
        .fn()
        .mockResolvedValue({ byPurpose: [], byModel: [], totalCostUsd: 0 }),
      findOne: jest.fn().mockResolvedValue({ id: 'lc-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LlmCallsController],
      providers: [{ provide: LlmCallsService, useValue: svc }],
    })
      .overrideGuard(StaffGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(LlmCallsController);
  });

  it('findAll passes query params to service', () => {
    controller.findAll(
      'parse',
      'gpt-4',
      'co-1',
      '2025-01-01',
      '2025-12-31',
      '2',
      '10',
    );
    expect(svc.findAll).toHaveBeenCalledWith({
      purpose: 'parse',
      model: 'gpt-4',
      companyId: 'co-1',
      from: '2025-01-01',
      to: '2025-12-31',
      page: 2,
      limit: 10,
    });
  });

  it('findAll with no params passes undefined values', () => {
    controller.findAll();
    expect(svc.findAll).toHaveBeenCalledWith({
      purpose: undefined,
      model: undefined,
      companyId: undefined,
      from: undefined,
      to: undefined,
      page: undefined,
      limit: undefined,
    });
  });

  it('summary delegates to service', () => {
    controller.summary();
    expect(svc.summary).toHaveBeenCalled();
  });

  it('findOne delegates to service', () => {
    controller.findOne('lc-1');
    expect(svc.findOne).toHaveBeenCalledWith('lc-1');
  });
});
