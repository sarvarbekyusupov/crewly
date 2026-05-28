import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { createHash } from 'crypto';

@Injectable()
export class StaffGuard implements CanActivate {
  constructor(private readonly db: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.cookies?.['staff_session'];
    if (!token) throw new UnauthorizedException();

    const tokenHash = createHash('sha256').update(token).digest('hex');
    const session = await this.db.staffSession.findUnique({
      where: { tokenHash },
      include: { staff: true },
    });

    if (!session || session.expiresAt < new Date()) {
      if (session)
        this.db.staffSession
          .delete({ where: { id: session.id } })
          .catch(() => {});
      throw new UnauthorizedException();
    }

    request.staff = session.staff;
    return true;
  }
}
