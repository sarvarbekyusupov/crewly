import { UnprocessableEntityException } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from './zod-validation.pipe';

const TestSchema = z.object({
  name: z.string().min(2),
  age: z.number().int().positive(),
});

describe('ZodValidationPipe', () => {
  let pipe: ZodValidationPipe;

  beforeEach(() => {
    pipe = new ZodValidationPipe(TestSchema);
  });

  it('passes valid data through unchanged', () => {
    const input = { name: 'Alice', age: 30 };
    const result = pipe.transform(input, {} as any);
    expect(result).toEqual(input);
  });

  it('throws UnprocessableEntityException for invalid data', () => {
    const input = { name: 'A', age: -1 };
    expect(() => pipe.transform(input, {} as any)).toThrow(
      UnprocessableEntityException,
    );
  });

  it('includes field path in validation error details', () => {
    try {
      pipe.transform({ name: 'A', age: 30 }, {} as any);
    } catch (err: any) {
      const body = err.getResponse();
      expect(body.code).toBe('VALIDATION_ERROR');
      expect(body.details).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'name' })]),
      );
    }
  });

  it('throws for missing required fields', () => {
    expect(() => pipe.transform({}, {} as any)).toThrow(
      UnprocessableEntityException,
    );
  });

  it('strips extra fields not in schema (Zod default behavior)', () => {
    const input = { name: 'Alice', age: 25, extra: 'value' };
    const result = pipe.transform(input, {} as any) as any;
    expect(result).not.toHaveProperty('extra');
  });
});
