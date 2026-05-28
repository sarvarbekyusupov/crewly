import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import { ZodError } from 'zod';
import { Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      return response.status(status).json({
        error:
          typeof exceptionResponse === 'string'
            ? { code: 'HTTP_ERROR', message: exceptionResponse }
            : exceptionResponse,
      });
    }

    if (exception instanceof ZodError) {
      return response.status(HttpStatus.UNPROCESSABLE_ENTITY).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input',
          details: exception.issues.map((i) => ({
            field: i.path.join('.'),
            message: i.message,
          })),
        },
      });
    }

    this.logger.error(exception);
    if (process.env.SENTRY_DSN) {
      Sentry.captureException(exception);
    }

    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  }
}
