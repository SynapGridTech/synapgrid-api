import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import { Role } from './roles.enum';

export interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    email: string;
    role: Role;
  };
}

/**
 * Role-based access control guard. Reads the roles metadata set by @Roles()
 * and compares against the authenticated principal's role.
 * Must run after JwtAuthGuard.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!user || !required.includes(user.role)) {
      throw new ForbiddenException(
        `Requires one of roles: [${required.join(', ')}]`,
      );
    }
    return true;
  }
}
