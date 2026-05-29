import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CandidateAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.cookies?.['c_access_token'];
    if (!token) throw new UnauthorizedException();

    try {
      const payload = this.jwt.verify(token, {
        secret: this.config.get<string>('JWT_CANDIDATE_SECRET'),
      });
      if (payload.type !== 'candidate_access' || !payload.sub)
        throw new UnauthorizedException();
      request.candidate = { id: payload.sub };
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
