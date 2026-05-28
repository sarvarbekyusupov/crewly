import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, from, lastValueFrom } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Runs request handlers inside Prisma tenant context so middleware
 * auto-filters Job, Application, Placement, and Invoice by companyId.
 */
@Injectable()
export class TenantInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const companyId = request.user?.companyId as string | undefined;
    if (!companyId) return next.handle();

    return from(
      this.prisma.runInTenantContext(companyId, () =>
        lastValueFrom(next.handle()),
      ),
    );
  }
}
