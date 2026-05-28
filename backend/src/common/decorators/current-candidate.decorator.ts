import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentCandidate = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) =>
    ctx.switchToHttp().getRequest().candidate,
);
