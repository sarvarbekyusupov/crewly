import { Test, TestingModule } from '@nestjs/testing';
import { CostCalculatorService } from './cost-calculator.service';

describe('CostCalculatorService', () => {
  let service: CostCalculatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CostCalculatorService],
    }).compile();
    service = module.get(CostCalculatorService);
  });

  it('returns 0 when usage is undefined', () => {
    expect(service.compute('llama-3.3-70b-versatile', undefined)).toBe(0);
  });

  it('returns 0 for unknown model', () => {
    expect(
      service.compute('unknown-model', {
        input_tokens: 1000,
        output_tokens: 500,
      }),
    ).toBe(0);
  });

  it('calculates cost correctly for known model', () => {
    // llama-3.3-70b-versatile: $0.59/1M input, $0.79/1M output
    const cost = service.compute('llama-3.3-70b-versatile', {
      input_tokens: 1_000_000,
      output_tokens: 1_000_000,
    });
    expect(cost).toBeCloseTo(0.59 + 0.79, 5);
  });

  it('uses prompt_tokens and completion_tokens as fallback', () => {
    const cost = service.compute('llama-3.3-70b-versatile', {
      prompt_tokens: 1_000_000,
      completion_tokens: 1_000_000,
    });
    expect(cost).toBeCloseTo(0.59 + 0.79, 5);
  });

  it('calculates embedding cost (output price = 0)', () => {
    const cost = service.compute('text-embedding-3-small', {
      input_tokens: 1_000_000,
      output_tokens: 0,
    });
    expect(cost).toBeCloseTo(0.02, 5);
  });
});
