import { HttpException, HttpStatus } from '@nestjs/common';
import { ZodError, z } from 'zod';
import { GlobalExceptionFilter } from './global-exception.filter';

function makeHost(res: { status: jest.Mock; json: jest.Mock }) {
  return {
    switchToHttp: () => ({
      getResponse: () => res,
    }),
  } as any;
}

function makeResponse() {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  return { status, json };
}

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;

  beforeEach(() => {
    filter = new GlobalExceptionFilter();
  });

  it('formats HttpException with string response', () => {
    const res = makeResponse();
    const host = makeHost(res);
    const exception = new HttpException('Not found', HttpStatus.NOT_FOUND);

    filter.catch(exception, host);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'HTTP_ERROR', message: 'Not found' },
    });
  });

  it('formats HttpException with object response', () => {
    const res = makeResponse();
    const host = makeHost(res);
    const exception = new HttpException(
      { code: 'CUSTOM', message: 'custom error' },
      HttpStatus.BAD_REQUEST,
    );

    filter.catch(exception, host);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'CUSTOM', message: 'custom error' },
    });
  });

  it('formats ZodError as VALIDATION_ERROR', () => {
    const res = makeResponse();
    const host = makeHost(res);

    const schema = z.object({ name: z.string() });
    let zodError: ZodError | null = null;
    try {
      schema.parse({ name: 123 });
    } catch (err) {
      zodError = err as ZodError;
    }

    filter.catch(zodError!, host);

    expect(res.status).toHaveBeenCalledWith(HttpStatus.UNPROCESSABLE_ENTITY);
    const jsonCall = res.json.mock.calls[0][0];
    expect(jsonCall.error.code).toBe('VALIDATION_ERROR');
    expect(jsonCall.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'name' })]),
    );
  });

  it('formats unknown errors as INTERNAL_ERROR with 500', () => {
    const res = makeResponse();
    const host = makeHost(res);

    filter.catch(new Error('unexpected'), host);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  });
});
