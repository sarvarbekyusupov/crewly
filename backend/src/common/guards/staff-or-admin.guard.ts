import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { hashToken } from '../utils/token.utils';

@Injectable()
export class StaffOrAdminGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly db: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const staffToken = request.cookies?.['staff_session'];
    const userToken = request.cookies?.['hr_access_token'];

    // 1. Try Staff session
    if (staffToken) {
      const tokenHash = hashToken(staffToken);
      const session = await this.db.staffSession.findUnique({
        where: { tokenHash },
        include: { staff: true },
      });
      if (session && session.expiresAt > new Date()) {
        request.staff = session.staff;
        return true;
      }
    }

    // 2. Try Company User session
    if (userToken) {
      try {
        const payload = this.jwt.verify(userToken, {
          secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        });
        if (payload.type === 'access' && payload.sub) {
          // Verify admin or owner role
          if (['owner', 'admin'].includes(payload.role)) {
            request.user = {
              id: payload.sub,
              companyId: payload.companyId,
              role: payload.role,
            };
            return true;
          } else {
            // Throw forbidden if user is authenticated but has no role
            throw new ForbiddenException('Admin or owner role required for sourcing');
          }
        }
      } catch (e) {
        if (e instanceof ForbiddenException) throw e;
        // Ignore JWT verification errors for userToken, might be invalid/expired
        // but we still want to throw Unauthorized if nothing else worked.
      }
    }

    throw new UnauthorizedException('Requires Staff or Admin access');
  }
}
