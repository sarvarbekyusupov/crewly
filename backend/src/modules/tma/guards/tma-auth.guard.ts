import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

export const TMA_ROLE_KEY = 'tma_role';
export const TmaRole = (role: 'candidate' | 'hr') =>
  SetMetadata(TMA_ROLE_KEY, role);

@Injectable()
export class TmaAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const authHeader: string | undefined = req.headers?.authorization;
    if (!authHeader?.startsWith('Bearer '))
      throw new UnauthorizedException('Missing Bearer token');

    const token = authHeader.slice(7);
    const secret = this.config.get<string>('JWT_CANDIDATE_SECRET');

    let payload: any;
    try {
      payload = this.jwt.verify(token, { secret });
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    if (payload.type !== 'tma_candidate' && payload.type !== 'tma_hr') {
      throw new UnauthorizedException('Invalid token type');
    }

    req.tmaUser = {
      id: payload.sub,
      type: payload.type,
      telegramId: payload.telegramId,
    };

    // Check role requirement if set
    const handler = ctx.getHandler();
    const requiredRole = this.reflector.get<'candidate' | 'hr'>(
      TMA_ROLE_KEY,
      handler,
    );
    if (requiredRole) {
      const actualRole = payload.type === 'tma_hr' ? 'hr' : 'candidate';
      if (actualRole !== requiredRole)
        throw new ForbiddenException('Wrong role for this endpoint');
    }

    return true;
  }
}
