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
      .select(
        "users.id",
        "users.login",
        "users.password_hash",
        "users.surname",
        "users.name",
        "users.patronymic",
        "users.department_id",
        "users.must_change_password",
        "users.lang",
        "roles.name as role"
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

    await this.sessionsService.logSession(user.id, ip, userAgent || "");

    const token = this.jwtService.sign(
      {
        sub: user.id,
        login: user.login,
        role: user.role,
        departmentId: user.department_id,
        mustChangePassword: user.must_change_password,
        lang: user.lang
      },
      { expiresIn: this.config.get<string>("JWT_EXPIRES_IN", "1d") }
    );

    return {
      accessToken: token,
      user: {
        id: user.id,
        login: user.login,
        role: user.role,
        departmentId: user.department_id,
        mustChangePassword: user.must_change_password,
        surname: user.surname,
        name: user.name,
        patronymic: user.patronymic,
        lang: user.lang
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

    return { success: true };
  }
}
