import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { DatabaseService } from "../../db/database.service";

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
  canSubmitFiles?: boolean;
  tokenVersion?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly config: ConfigService,
    private readonly dbService: DatabaseService
  ) {
    const secret = config.get<string>("JWT_SECRET");
    if (!secret || secret === "change_me") {
      throw new Error("JWT_SECRET must be set to a secure value.");
    }
    const cookieName = config.get<string>("AUTH_COOKIE_NAME", "access_token");
    const cookieExtractor = (req: any) => {
      const header = req?.headers?.cookie;
      if (!header) return null;
      const cookies = header.split(";").map((part: string) => part.trim());
      const match = cookies.find((part: string) => part.startsWith(`${cookieName}=`));
      if (!match) return null;
      const value = match.slice(cookieName.length + 1);
      return value ? decodeURIComponent(value) : null;
    };

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        cookieExtractor
      ]),
      ignoreExpiration: false,
      secretOrKey: secret
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.dbService.db("users")
      .leftJoin("roles", "roles.id", "users.role_id")
      .leftJoin("departments", "departments.id", "users.department_id")
      .select(
        "users.id",
        "users.login",
        "users.role_id",
        "users.department_id",
        "users.must_change_password",
        "users.lang",
        "users.can_submit_files",
        "users.token_version",
        "roles.name as role",
        "roles.level as role_level",
        "departments.name as department"
      )
      .where("users.id", payload.sub)
      .whereNull("users.deleted_at")
      .first();

    if (!user) {
      throw new UnauthorizedException();
    }

    const tokenVersion = Number(user.token_version || 0);
    if (Number(payload.tokenVersion || 0) !== tokenVersion) {
      throw new UnauthorizedException("Token revoked");
    }

    const permissions = await this.dbService
      .db("role_permissions")
      .leftJoin("permissions", "permissions.id", "role_permissions.permission_id")
      .where("role_permissions.role_id", user.role_id)
      .pluck("permissions.name");

    return {
      id: user.id,
      login: user.login,
      role: user.role,
      roleLevel: user.role_level,
      departmentId: user.department_id,
      department: user.department || null,
      mustChangePassword: user.must_change_password,
      lang: user.lang || null,
      permissions: permissions || [],
      canSubmitFiles: user.can_submit_files ?? false
    };
  }
}
