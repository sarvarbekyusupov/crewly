import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

const ROLE_HIERARCHY: Record<string, number> = {
  owner: 4,
  admin: 3,
  hiring_manager: 2,
  viewer: 1,
};

@Injectable()
export class CompanyRoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const user = context.switchToHttp().getRequest().user;
    if (!user) throw new ForbiddenException();

    const userLevel = ROLE_HIERARCHY[user.role] ?? 0;
    const hasRole = requiredRoles.some(
      (role) => userLevel >= (ROLE_HIERARCHY[role] ?? 0),
    );
    if (!hasRole) throw new ForbiddenException('Insufficient role');
    return true;
  }
}
