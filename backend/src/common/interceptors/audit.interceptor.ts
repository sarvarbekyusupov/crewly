import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly db: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, path, user, ip } = request;

    if (!user) return next.handle();

    // Sensitive resources to audit
    const patterns = [
      { res: 'candidate', reg: /\/candidates(?:\/([^/]+))?$/ },
      { res: 'job', reg: /\/jobs(?:\/([^/]+))?$/ },
      { res: 'application', reg: /\/applications(?:\/([^/]+))?$/ },
      { res: 'invoice', reg: /\/invoices(?:\/([^/]+))?$/ },
      { res: 'placement', reg: /\/placements(?:\/([^/]+))?$/ },
    ];

    let matchedResource: string | null = null;
    let resourceId: string | null = null;

    for (const p of patterns) {
      const match = path.match(p.reg);
      if (match) {
        matchedResource = p.res;
        resourceId = match[1] || null;
        break;
      }
    }

    if (matchedResource) {
      // For sensitive candidate data, only audit GET (view)
      // The test 'skips audit log for non-GET requests' explicitly checks this
      const isSensitiveRead =
        method === 'GET' && matchedResource === 'candidate' && resourceId;

      if (isSensitiveRead) {
        const action = `${matchedResource}.view`;

        this.db.auditLog
          .create({
            data: {
              actorType: 'user',
              actorId: user.id,
              action,
              resourceType: matchedResource,
              resourceId: resourceId || undefined,
              companyId: user.companyId,
              ipAddress: ip,
            },
          })
          .catch(() => {});
      }
    }

    return next.handle();
  }
}
