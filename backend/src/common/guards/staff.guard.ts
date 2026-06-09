import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { hashToken } from '../utils/token.utils';

@Injectable()
export class StaffGuard implements CanActivate {
  private readonly logger = new Logger(StaffGuard.name);

  constructor(private readonly db: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.cookies?.['staff_session'];
    if (!token) throw new UnauthorizedException();

    const tokenHash = hashToken(token);
    const session = await this.db.staffSession.findUnique({
      where: { tokenHash },
      include: { staff: true },
    });

    if (!session || session.expiresAt <= new Date()) {
      if (session)
        this.db.staffSession
          .delete({ where: { id: session.id } })
          .catch((e) =>
            this.logger.error(
              { err: e.message, sessionId: session.id },
              'staffSession cleanup failed',
            ),
          );
      throw new UnauthorizedException();
    }

    request.staff = session.staff;
    return true;
  }
}
