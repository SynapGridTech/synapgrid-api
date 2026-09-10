import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedRequest } from '../guards/roles.guard';

/** Injects the authenticated principal into a handler parameter. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedRequest['user'] => {
    return ctx.switchToHttp().getRequest<AuthenticatedRequest>().user;
  },
);
