import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { DatabaseService } from "../../db/database.service";
import { buildPaginationMeta } from "../../common/utils/pagination";
import { AuditService } from "../audit/audit.service";

function generateTempPassword() {
  return crypto.randomBytes(6).toString("base64url");
}

@Injectable()
export class UsersService {
  constructor(
    private readonly dbService: DatabaseService,
    private readonly auditService: AuditService
  ) {}

  async list(params: { page: number; pageSize: number; q?: string }) {
    const { page, pageSize, q } = params;
    const query = this.dbService.db("users")
      .leftJoin("roles", "roles.id", "users.role_id")
      .leftJoin("departments", "departments.id", "users.department_id")
      .select(
        "users.id",
        "users.login",
        "users.surname",
        "users.name",
        "users.patronymic",
        "users.role_id",
        "roles.name as role",
        "users.department_id",
        "departments.name as department",
        "users.must_change_password",
        "users.deleted_at",
        "users.lang",
        "users.created_at"
      )
      .orderBy("users.created_at", "desc");

    if (q) {
      query.where((builder) => {
        builder
          .whereILike("users.login", `%${q}%`)
          .orWhereILike("users.surname", `%${q}%`)
          .orWhereILike("users.name", `%${q}%`);
      });
    }

    const countResult = await query
      .clone()
      .clearSelect()
      .clearOrder()
      .count<{ count: string }>("users.id as count")
      .first();
    const data = await query.offset((page - 1) * pageSize).limit(pageSize);

    return {
      data,
      meta: buildPaginationMeta(page, pageSize, Number(countResult?.count || 0))
    };
  }

  async create(dto: any, actorId: number) {
    const existing = await this.dbService
      .db("users")
      .where({ login: dto.login })
      .whereNull("deleted_at")
      .first();

    if (existing) {
      throw new BadRequestException("Login already exists");
    }

    const tempPassword = generateTempPassword();
    const hash = await bcrypt.hash(tempPassword, 10);

    const [id] = await this.dbService
      .db("users")
      .insert({
        login: dto.login,
        password_hash: hash,
        surname: dto.surname,
        name: dto.name,
        patronymic: dto.patronymic || null,
        role_id: dto.roleId,
        department_id: dto.departmentId || null,
        must_change_password: true,
        lang: dto.lang || "ru",
        created_at: this.dbService.db.fn.now(),
        updated_at: this.dbService.db.fn.now()
      })
      .returning("id");

    await this.auditService.log({
      actorUserId: actorId,
      action: "USER_CREATED",
      entityType: "USER",
      entityId: id.id || id,
      diff: { after: { login: dto.login, roleId: dto.roleId, departmentId: dto.departmentId || null } }
    });

    return { id: id.id || id, tempPassword };
  }

  async update(id: number, dto: any, actorId: number) {
    const user = await this.dbService.db("users").where({ id }).first();
    if (!user) throw new NotFoundException();

    if (dto.login && dto.login !== user.login) {
      const existing = await this.dbService
        .db("users")
        .where({ login: dto.login })
        .whereNull("deleted_at")
        .first();
      if (existing) {
        throw new BadRequestException("Login already exists");
      }
    }

    await this.dbService
      .db("users")
      .update({
        login: dto.login ?? user.login,
        surname: dto.surname ?? user.surname,
        name: dto.name ?? user.name,
        patronymic: dto.patronymic ?? user.patronymic,
        role_id: dto.roleId ?? user.role_id,
        department_id: dto.departmentId ?? user.department_id,
        lang: dto.lang ?? user.lang,
        updated_at: this.dbService.db.fn.now()
      })
      .where({ id });

    await this.auditService.log({
      actorUserId: actorId,
      action: "USER_UPDATED",
      entityType: "USER",
      entityId: id,
      diff: { before: { login: user.login }, after: { login: dto.login ?? user.login } }
    });

    return { success: true };
  }

  async softDelete(id: number, actorId: number) {
    const user = await this.dbService.db("users").where({ id }).first();
    if (!user) throw new NotFoundException();

    await this.dbService.db("users").update({ deleted_at: this.dbService.db.fn.now() }).where({ id });

    await this.auditService.log({
      actorUserId: actorId,
      action: "USER_DELETED",
      entityType: "USER",
      entityId: id
    });

    return { success: true };
  }

  async restore(id: number, actorId: number) {
    const user = await this.dbService.db("users").where({ id }).first();
    if (!user) throw new NotFoundException();

    const existing = await this.dbService
      .db("users")
      .where({ login: user.login })
      .whereNull("deleted_at")
      .first();
    if (existing) {
      throw new BadRequestException("Active user with this login exists");
    }

    await this.dbService.db("users").update({ deleted_at: null }).where({ id });

    await this.auditService.log({
      actorUserId: actorId,
      action: "USER_RESTORED",
      entityType: "USER",
      entityId: id
    });

    return { success: true };
  }

  async resetPassword(id: number, actorId: number) {
    const user = await this.dbService.db("users").where({ id }).first();
    if (!user) throw new NotFoundException();

    const tempPassword = generateTempPassword();
    const hash = await bcrypt.hash(tempPassword, 10);

    await this.dbService
      .db("users")
      .update({
        password_hash: hash,
        must_change_password: true,
        updated_at: this.dbService.db.fn.now()
      })
      .where({ id });

    await this.auditService.log({
      actorUserId: actorId,
      action: "USER_PASSWORD_RESET",
      entityType: "USER",
      entityId: id
    });

    return { tempPassword };
  }

  async changePassword(userId: number, currentPassword: string, newPassword: string) {
    const user = await this.dbService
      .db("users")
      .select("id", "password_hash")
      .where({ id: userId })
      .first();
    if (!user) throw new NotFoundException();

    const ok = await bcrypt.compare(currentPassword, user.password_hash);
    if (!ok) {
      throw new BadRequestException("Current password is invalid");
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await this.dbService
      .db("users")
      .update({
        password_hash: hash,
        must_change_password: false,
        updated_at: this.dbService.db.fn.now()
      })
      .where({ id: userId });

    return { success: true };
  }

  async changeLanguage(userId: number, lang: string) {
    await this.dbService
      .db("users")
      .update({ lang, updated_at: this.dbService.db.fn.now() })
      .where({ id: userId });
    return { success: true };
  }
}
