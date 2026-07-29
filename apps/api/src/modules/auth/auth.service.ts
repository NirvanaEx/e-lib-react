import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  HttpException,
  HttpStatus
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import bcrypt from "bcrypt";
import { DatabaseService } from "../../db/database.service";
import { SessionsService } from "../sessions/sessions.service";

// Rate limiting alone cannot stop a slow, distributed password spray, so
// failed attempts are also counted per account and per source address.
const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_LOCKOUT_MINUTES = 15;
// A single address may legitimately host a whole office behind NAT, so its
// budget is a multiple of the per-account one.
const IP_ATTEMPT_MULTIPLIER = 6;

@Injectable()
export class AuthService {
  constructor(
    private readonly dbService: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly sessionsService: SessionsService
  ) {}

  private getLockoutSettings() {
    const maxAttempts = Number(this.config.get<string>("LOGIN_MAX_ATTEMPTS", String(DEFAULT_MAX_ATTEMPTS)));
    const lockoutMinutes = Number(
      this.config.get<string>("LOGIN_LOCKOUT_MINUTES", String(DEFAULT_LOCKOUT_MINUTES))
    );
    return {
      maxAttempts: Number.isFinite(maxAttempts) && maxAttempts > 0 ? maxAttempts : DEFAULT_MAX_ATTEMPTS,
      lockoutMinutes:
        Number.isFinite(lockoutMinutes) && lockoutMinutes > 0 ? lockoutMinutes : DEFAULT_LOCKOUT_MINUTES
    };
  }

  private async recordLoginAttempt(params: {
    login: string;
    userId: number | null;
    success: boolean;
    reason: string | null;
    ip: string | null;
    userAgent: string | null;
  }) {
    try {
      await this.dbService.db("login_attempts").insert({
        login: String(params.login || "").slice(0, 255),
        user_id: params.userId,
        success: params.success,
        reason: params.reason,
        ip: params.ip || null,
        user_agent: (params.userAgent || "").slice(0, 255) || null,
        created_at: this.dbService.db.fn.now()
      });
    } catch (_err) {
      // Never let audit bookkeeping break the login flow itself.
      return;
    }
  }

  // Returns the number of seconds the caller must wait, or 0 when not locked.
  private async getLockoutSeconds(login: string, ip: string | null) {
    const { maxAttempts, lockoutMinutes } = this.getLockoutSettings();
    const since = new Date(Date.now() - lockoutMinutes * 60 * 1000);
    const db = this.dbService.db;

    const byLogin = await db("login_attempts")
      .where("success", false)
      .whereRaw("lower(login) = lower(?)", [login])
      .where("created_at", ">=", since)
      .count<{ count: string }>("id as count")
      .first();

    const byIp = ip
      ? await db("login_attempts")
          .where("success", false)
          .where("ip", ip)
          .where("created_at", ">=", since)
          .count<{ count: string }>("id as count")
          .first()
      : null;

    const loginFailures = Number(byLogin?.count || 0);
    const ipFailures = Number(byIp?.count || 0);
    if (loginFailures < maxAttempts && ipFailures < maxAttempts * IP_ATTEMPT_MULTIPLIER) {
      return 0;
    }

    const lastFailure = await db("login_attempts")
      .where("success", false)
      .where((builder) => {
        builder.whereRaw("lower(login) = lower(?)", [login]);
        if (ip && ipFailures >= maxAttempts * IP_ATTEMPT_MULTIPLIER) {
          builder.orWhere("ip", ip);
        }
      })
      .where("created_at", ">=", since)
      .max<{ last: string }>("created_at as last")
      .first();

    const lastAt = lastFailure?.last ? new Date(lastFailure.last).getTime() : Date.now();
    const unlockAt = lastAt + lockoutMinutes * 60 * 1000;
    return Math.max(1, Math.ceil((unlockAt - Date.now()) / 1000));
  }

  private async getDepartmentPath(departmentId: number | null) {
    if (!departmentId) return null;
    const result = await this.dbService.db.raw(
      `WITH RECURSIVE tree AS (
        SELECT id, name, parent_id, depth FROM departments WHERE id = ?
        UNION ALL
        SELECT d.id, d.name, d.parent_id, d.depth
        FROM departments d
        JOIN tree t ON t.parent_id = d.id
      )
      SELECT id, name, depth FROM tree`,
      [departmentId]
    );
    const rows = (result?.rows || [])
      .map((row: any) => ({ name: row.name, depth: Number(row.depth) }))
      .filter((row: any) => row.name);
    if (!rows.length) return null;
    rows.sort((a: any, b: any) => a.depth - b.depth);
    return rows.map((row: any) => row.name).join("/");
  }

  async login(login: string, password: string, ip: string, userAgent: string | undefined) {
    const clientIp = ip || null;
    const lockedFor = await this.getLockoutSeconds(login, clientIp);
    if (lockedFor > 0) {
      await this.recordLoginAttempt({
        login,
        userId: null,
        success: false,
        reason: "locked",
        ip: clientIp,
        userAgent: userAgent || null
      });
      // Same wording whether or not the account exists, so the lockout does
      // not turn into a login enumeration oracle.
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: "Too many failed attempts. Try again later.",
          retryAfter: lockedFor
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

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
        "users.token_version",
        "users.lang",
        "users.can_submit_files",
        "users.avatar",
        "roles.name as role",
        "roles.level as role_level",
        "departments.name as department"
      )
      .where("users.login", login)
      .whereNull("users.deleted_at")
      .first();

    if (!user) {
      await this.recordLoginAttempt({
        login,
        userId: null,
        success: false,
        reason: "unknown_login",
        ip: clientIp,
        userAgent: userAgent || null
      });
      throw new UnauthorizedException("Invalid credentials");
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      await this.recordLoginAttempt({
        login,
        userId: user.id,
        success: false,
        reason: "invalid_password",
        ip: clientIp,
        userAgent: userAgent || null
      });
      throw new UnauthorizedException("Invalid credentials");
    }

    await this.recordLoginAttempt({
      login,
      userId: user.id,
      success: true,
      reason: null,
      ip: clientIp,
      userAgent: userAgent || null
    });

    const permissions = await this.dbService
      .db("role_permissions")
      .leftJoin("permissions", "permissions.id", "role_permissions.permission_id")
      .where("role_permissions.role_id", user.role_id)
      .pluck("permissions.name");

    await this.sessionsService.logSession(user.id, ip, userAgent || "");

    const departmentPath = await this.getDepartmentPath(user.department_id);
    const token = this.jwtService.sign(
      {
        sub: user.id,
        login: user.login,
        role: user.role,
        roleLevel: user.role_level,
        departmentId: user.department_id,
        department: departmentPath || user.department,
        mustChangePassword: user.must_change_password,
        lang: user.lang,
        canSubmitFiles: user.can_submit_files,
        permissions,
        tokenVersion: Number(user.token_version || 0)
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
        department: departmentPath || user.department,
        mustChangePassword: user.must_change_password,
        surname: user.surname,
        name: user.name,
        patronymic: user.patronymic,
        lang: user.lang,
        canSubmitFiles: user.can_submit_files,
        avatar: user.avatar || null,
        permissions
      }
    };
  }

  async me(userId: number) {
    const user = await this.dbService.db("users")
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
        "users.must_change_password",
        "users.lang",
        "users.can_submit_files",
        "users.avatar",
        "roles.name as role",
        "roles.level as role_level",
        "departments.name as department"
      )
      .where("users.id", userId)
      .whereNull("users.deleted_at")
      .first();

    if (!user) {
      throw new UnauthorizedException();
    }

    const permissions = await this.dbService
      .db("role_permissions")
      .leftJoin("permissions", "permissions.id", "role_permissions.permission_id")
      .where("role_permissions.role_id", user.role_id)
      .pluck("permissions.name");

    const departmentPath = await this.getDepartmentPath(user.department_id);

    return {
      user: {
        id: user.id,
        login: user.login,
        role: user.role,
        roleLevel: user.role_level,
        departmentId: user.department_id,
        department: departmentPath || user.department,
        mustChangePassword: user.must_change_password,
        surname: user.surname,
        name: user.name,
        patronymic: user.patronymic,
        lang: user.lang,
        canSubmitFiles: user.can_submit_files,
        avatar: user.avatar || null,
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

    // The temp password is known to whoever handed it out, so reusing it here
    // would leave the account effectively unprotected.
    const sameAsCurrent = await bcrypt.compare(newPassword, user.password_hash);
    if (sameAsCurrent) {
      throw new BadRequestException("New password must differ from the current one");
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await this.dbService.db("users")
      .update({
        password_hash: hash,
        must_change_password: false,
        token_version: this.dbService.db.raw("token_version + 1"),
        updated_at: this.dbService.db.fn.now()
      })
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
        "users.token_version",
        "users.can_submit_files",
        "users.avatar",
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

    const departmentPath = await this.getDepartmentPath(refreshed.department_id);
    const token = this.jwtService.sign(
      {
        sub: refreshed.id,
        login: refreshed.login,
        role: refreshed.role,
        roleLevel: refreshed.role_level,
        departmentId: refreshed.department_id,
        department: departmentPath || refreshed.department,
        mustChangePassword: false,
        lang: refreshed.lang,
        canSubmitFiles: refreshed.can_submit_files,
        permissions,
        tokenVersion: Number(refreshed.token_version || 0)
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
        department: departmentPath || refreshed.department,
        mustChangePassword: false,
        surname: refreshed.surname,
        name: refreshed.name,
        patronymic: refreshed.patronymic,
        lang: refreshed.lang,
        canSubmitFiles: refreshed.can_submit_files,
        avatar: refreshed.avatar || null,
        permissions
      }
    };
  }
}
