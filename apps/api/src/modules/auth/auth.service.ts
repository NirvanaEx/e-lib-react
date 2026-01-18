import { Injectable, UnauthorizedException, BadRequestException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import bcrypt from "bcrypt";
import { DatabaseService } from "../../db/database.service";
import { SessionsService } from "../sessions/sessions.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly dbService: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly sessionsService: SessionsService
  ) {}

  async login(login: string, password: string, ip: string, userAgent: string | undefined) {
    const user = await this.dbService.db("users")
      .leftJoin("roles", "roles.id", "users.role_id")
      .leftJoin("departments", "departments.id", "users.department_id")
      .select(
        "users.id",
        "users.login",
        "users.password_hash",
        "users.surname",
        "users.name",
        "users.patronymic",
        "users.role_id",
        "users.department_id",
        "users.must_change_password",
        "users.lang",
        "roles.name as role",
        "roles.level as role_level",
        "departments.name as department"
      )
      .where("users.login", login)
      .whereNull("users.deleted_at")
      .first();

    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const permissions = await this.dbService
      .db("role_permissions")
      .leftJoin("permissions", "permissions.id", "role_permissions.permission_id")
      .where("role_permissions.role_id", user.role_id)
      .pluck("permissions.name");

    await this.sessionsService.logSession(user.id, ip, userAgent || "");

    const token = this.jwtService.sign(
      {
        sub: user.id,
        login: user.login,
        role: user.role,
        roleLevel: user.role_level,
        departmentId: user.department_id,
        department: user.department,
        mustChangePassword: user.must_change_password,
        lang: user.lang,
        permissions
      },
      { expiresIn: this.config.get<string>("JWT_EXPIRES_IN", "1d") }
    );

    return {
      accessToken: token,
      user: {
        id: user.id,
        login: user.login,
        role: user.role,
        roleLevel: user.role_level,
        departmentId: user.department_id,
        department: user.department,
        mustChangePassword: user.must_change_password,
        surname: user.surname,
        name: user.name,
        patronymic: user.patronymic,
        lang: user.lang,
        permissions
      }
    };
  }

  async changeTempPassword(userId: number, currentPassword: string, newPassword: string) {
    const user = await this.dbService.db("users")
      .select("id", "password_hash", "must_change_password")
      .where({ id: userId })
      .first();

    if (!user) {
      throw new UnauthorizedException();
    }

    const ok = await bcrypt.compare(currentPassword, user.password_hash);
    if (!ok) {
      throw new BadRequestException("Current password is invalid");
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await this.dbService.db("users")
      .update({ password_hash: hash, must_change_password: false, updated_at: this.dbService.db.fn.now() })
      .where({ id: userId });

    const refreshed = await this.dbService.db("users")
      .leftJoin("roles", "roles.id", "users.role_id")
      .leftJoin("departments", "departments.id", "users.department_id")
      .select(
        "users.id",
        "users.login",
        "users.surname",
        "users.name",
        "users.patronymic",
        "users.role_id",
        "users.department_id",
        "users.lang",
        "users.must_change_password",
        "roles.name as role",
        "roles.level as role_level",
        "departments.name as department"
      )
      .where("users.id", userId)
      .first();

    if (!refreshed) {
      throw new UnauthorizedException();
    }

    const permissions = await this.dbService
      .db("role_permissions")
      .leftJoin("permissions", "permissions.id", "role_permissions.permission_id")
      .where("role_permissions.role_id", refreshed.role_id)
      .pluck("permissions.name");

    const token = this.jwtService.sign(
      {
        sub: refreshed.id,
        login: refreshed.login,
        role: refreshed.role,
        roleLevel: refreshed.role_level,
        departmentId: refreshed.department_id,
        department: refreshed.department,
        mustChangePassword: false,
        lang: refreshed.lang,
        permissions
      },
      { expiresIn: this.config.get<string>("JWT_EXPIRES_IN", "1d") }
    );

    return {
      accessToken: token,
      user: {
        id: refreshed.id,
        login: refreshed.login,
        role: refreshed.role,
        roleLevel: refreshed.role_level,
        departmentId: refreshed.department_id,
        department: refreshed.department,
        mustChangePassword: false,
        surname: refreshed.surname,
        name: refreshed.name,
        patronymic: refreshed.patronymic,
        lang: refreshed.lang,
        permissions
      }
    };
  }
}
