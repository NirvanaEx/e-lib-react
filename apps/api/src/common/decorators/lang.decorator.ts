import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export const Lang = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return (
      request.headers["x-lang"] ||
      request.query.lang ||
      request.user?.lang ||
      null
    );
  }
);
