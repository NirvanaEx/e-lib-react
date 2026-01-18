import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";

export interface JwtPayload {
  sub: number;
  login: string;
  role: string;
  roleLevel?: number;
  departmentId: number | null;
  department?: string | null;
  mustChangePassword: boolean;
  lang?: string | null;
  permissions?: string[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>("JWT_SECRET", "change_me")
    });
  }

  async validate(payload: JwtPayload) {
    return {
      id: payload.sub,
      login: payload.login,
      role: payload.role,
      roleLevel: payload.roleLevel,
      departmentId: payload.departmentId,
      department: payload.department || null,
      mustChangePassword: payload.mustChangePassword,
      lang: payload.lang || null,
      permissions: payload.permissions || []
    };
  }
}
