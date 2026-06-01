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
import { Prisma } from '@prisma/client';

const STATUS_CODES: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'UNPROCESSABLE_ENTITY',
  429: 'TOO_MANY_REQUESTS',
  503: 'SERVICE_UNAVAILABLE',
};

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
            ? {
                code: STATUS_CODES[status] ?? 'HTTP_ERROR',
                message: exceptionResponse,
              }
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

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        return response.status(HttpStatus.CONFLICT).json({
          error: {
            code: 'CONFLICT_ERROR',
            message: 'A record with this value already exists.',
            target: exception.meta?.target,
          },
        });
      }
      if (exception.code === 'P2025') {
        return response.status(HttpStatus.NOT_FOUND).json({
          error: {
            code: 'NOT_FOUND_ERROR',
            message: 'The requested record was not found.',
          },
        });
      }
      if (exception.code === 'P2003') {
        return response.status(HttpStatus.BAD_REQUEST).json({
          error: {
            code: 'BAD_REQUEST_ERROR',
            message: 'Foreign key constraint failed.',
          },
        });
      }
      if (exception.code === 'P2014') {
        return response.status(HttpStatus.BAD_REQUEST).json({
          error: {
            code: 'BAD_REQUEST_ERROR',
            message: 'Required relation is missing or invalid.',
          },
        });
      }
      if (exception.code === 'P2019') {
        return response.status(HttpStatus.BAD_REQUEST).json({
          error: {
            code: 'BAD_REQUEST_ERROR',
            message: 'Input value is invalid or exceeds the allowed length.',
          },
        });
      }
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
