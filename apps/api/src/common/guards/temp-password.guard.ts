import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ALLOW_TEMP_PASSWORD_KEY } from "../constants";

@Injectable()
export class TempPasswordGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const allowTemp = this.reflector.getAllAndOverride<boolean>(
      ALLOW_TEMP_PASSWORD_KEY,
      [context.getHandler(), context.getClass()]
    );

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.mustChangePassword) {
      return true;
    }

    if (allowTemp) {
      return true;
    }

    throw new ForbiddenException("Password change required");
  }
}
