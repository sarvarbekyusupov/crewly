import {
  CallHandler,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, from, lastValueFrom } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TenantInterceptor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const companyId = request.user?.companyId as string | undefined;

    if (!companyId) {
      // If the user is authenticated (has a JWT sub) but has no companyId,
      // this is a misconfigured token — reject to prevent cross-tenant access.
      if (request.user?.id) {
        const isPublic = this.reflector.getAllAndOverride<boolean>(
          IS_PUBLIC_KEY,
          [context.getHandler(), context.getClass()],
        );
        if (!isPublic) {
          this.logger.warn(
            { path: request.url, userId: request.user.id },
            'Authenticated request missing companyId — rejecting',
          );
          throw new ForbiddenException('Missing tenant context');
        }
      }
      return next.handle();
    }

    return from(
      this.prisma.runInTenantContext(companyId, () =>
        lastValueFrom(next.handle()),
      ),
    );
  }
}
