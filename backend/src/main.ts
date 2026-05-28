import { NestFactory } from '@nestjs/core';
import { LogLevel } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as Sentry from '@sentry/nestjs';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { TenantInterceptor } from './common/interceptors/tenant.interceptor';
import { BigIntInterceptor } from './common/interceptors/bigint.interceptor';
import cookieParser from 'cookie-parser';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from './prisma/prisma.service';
import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { getQueueToken } from '@nestjs/bull';
import { Queue } from 'bull';
import { QUEUES } from './workers/queue-names';

function nestLogLevels(level: string): LogLevel[] {
  const map: Record<string, LogLevel[]> = {
    fatal: ['fatal', 'error'],
    error: ['fatal', 'error'],
    warn: ['fatal', 'error', 'warn'],
    info: ['fatal', 'error', 'warn', 'log'],
    debug: ['fatal', 'error', 'warn', 'log', 'debug'],
    trace: ['fatal', 'error', 'warn', 'log', 'debug', 'verbose'],
    verbose: ['fatal', 'error', 'warn', 'log', 'debug', 'verbose'],
  };
  return map[level] ?? map['info'];
}

async function bootstrap() {
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV ?? 'development',
    });
  }

  const app = await NestFactory.create(AppModule, {
    logger: nestLogLevels(process.env.LOG_LEVEL ?? 'info'),
  });

  app.use(cookieParser());

  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3001',
    credentials: true,
  });

  const prisma = app.get(PrismaService);

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(
    new TenantInterceptor(prisma),
    new BigIntInterceptor(),
    new AuditInterceptor(prisma),
  );

  // Bull Board — queue inspector at /admin/queues (basic auth protected)
  const bullBoardPassword = app.get(ConfigService).get<string>('BULL_BOARD_PASSWORD')!;
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/admin/queues');

  const queueAdapters = Object.values(QUEUES)
    .map((name) => {
      try {
        const q = app.get<Queue>(getQueueToken(name));
        return new BullAdapter(q);
      } catch {
        return null;
      }
    })
    .filter((a): a is BullAdapter => a !== null);

  createBullBoard({ queues: queueAdapters, serverAdapter });

  app.use(
    '/admin/queues',
    (req: Request, res: Response, next: NextFunction) => {
      const auth = req.headers['authorization'] ?? '';
      if (auth.startsWith('Basic ')) {
        const [user, pass] = Buffer.from(auth.slice(6), 'base64')
          .toString()
          .split(':');
        if (user === 'admin' && pass === bullBoardPassword) return next();
      }
      res.setHeader('WWW-Authenticate', 'Basic realm="Bull Board"');
      res.status(401).send('Authentication required');
    },
    serverAdapter.getRouter(),
  );

  if (process.env.NODE_ENV !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('MyHR API')
      .setDescription('AI-powered recruiting platform API')
      .setVersion('1.0')
      .addCookieAuth('hr_access_token', {
        type: 'apiKey',
        in: 'cookie',
        name: 'hr_access_token',
      })
      .addCookieAuth('staff_session', {
        type: 'apiKey',
        in: 'cookie',
        name: 'staff_session',
      })
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`API running on http://localhost:${port}`);
  console.log(`Swagger:    http://localhost:${port}/api/docs`);
  console.log(`Bull Board: http://localhost:${port}/admin/queues`);
}

bootstrap();
