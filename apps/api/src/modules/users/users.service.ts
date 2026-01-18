import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
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

  private async getActorRole(actorId: number) {
    return this.dbService.db("users")
      .leftJoin("roles", "roles.id", "users.role_id")
      .select("users.id", "roles.name as role", "roles.level as level")
      .where("users.id", actorId)
      .first();
  }

  private async getRoleById(roleId: number) {
    return this.dbService.db("roles").select("id", "name", "level").where({ id: roleId }).first();
  }

  private assertCanManageRole(actor: any, targetRole: { level?: number } | null) {
    if (!actor) {
      throw new ForbiddenException("Actor not found");
    }
    if (actor.role === "superadmin") return;
    if (!targetRole || Number(actor.level || 0) <= Number(targetRole.level || 0)) {
      throw new ForbiddenException("Insufficient role level");
    }
  }

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
        "roles.level as role_level",
        "users.department_id",
        "departments.name as department",
        "users.must_change_password",
        "users.deleted_at",
        "users.lang",
        "users.can_submit_files",
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

  async listOptions(params: { page: number; pageSize: number; q?: string }) {
    const { page, pageSize, q } = params;
    const query = this.dbService
      .db("users")
      .select("id", "login", "surname", "name", "patronymic")
      .whereNull("deleted_at")
      .orderBy("login", "asc");

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

    const targetRole = await this.getRoleById(dto.roleId);
    if (!targetRole) {
      throw new BadRequestException("Role not found");
    }

    if (targetRole.name === "superadmin") {
      const actor = await this.getActorRole(actorId);
      if (!actor || actor.role !== "superadmin") {
        throw new ForbiddenException("Only superadmin can assign superadmin");
      }
      const existingSuperadmin = await this.dbService.db("users")
        .where({ role_id: targetRole.id })
        .whereNull("deleted_at")
        .first();
      if (existingSuperadmin) {
        throw new BadRequestException("Superadmin already exists");
      }
    } else {
      const actor = await this.getActorRole(actorId);
      this.assertCanManageRole(actor, targetRole);
    }

    const departmentId = dto.departmentId || null;
    if (departmentId) {
      const department = await this.dbService.db("departments").where({ id: departmentId }).first();
      if (!department) {
        throw new BadRequestException("Department not found");
      }
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
        role_id: targetRole.id,
        department_id: departmentId,
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
      diff: { after: { login: dto.login, roleId: targetRole.id, departmentId: dto.departmentId || null } }
    });

    return { id: id.id || id, tempPassword };
  }

  async update(id: number, dto: any, actorId: number) {
    const user = await this.dbService.db("users")
      .leftJoin("roles", "roles.id", "users.role_id")
      .select("users.*", "roles.name as role_name", "roles.level as role_level")
      .where("users.id", id)
      .first();
    if (!user) throw new NotFoundException();

    const actor = await this.getActorRole(actorId);
    this.assertCanManageRole(actor, { level: user.role_level });

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

    let targetRoleId = user.role_id;
    if (dto.roleId !== undefined) {
      const targetRole = await this.getRoleById(dto.roleId);
      if (!targetRole) {
        throw new BadRequestException("Role not found");
      }
      if (targetRole.name === "superadmin") {
        if (!actor || actor.role !== "superadmin") {
          throw new ForbiddenException("Only superadmin can assign superadmin");
        }
        const existingSuperadmin = await this.dbService.db("users")
          .where({ role_id: targetRole.id })
          .whereNull("deleted_at")
          .whereNot({ id })
          .first();
        if (existingSuperadmin) {
          throw new BadRequestException("Superadmin already exists");
        }
      } else {
        this.assertCanManageRole(actor, targetRole);
      }
      targetRoleId = targetRole.id;
    }

    if (dto.departmentId !== undefined) {
      const departmentId = dto.departmentId || null;
      if (departmentId) {
        const department = await this.dbService.db("departments").where({ id: departmentId }).first();
        if (!department) {
          throw new BadRequestException("Department not found");
        }
      }
    }

    const updatePayload: Record<string, any> = {
      login: dto.login ?? user.login,
      surname: dto.surname ?? user.surname,
      name: dto.name ?? user.name,
      patronymic: dto.patronymic ?? user.patronymic,
      role_id: targetRoleId,
      department_id: dto.departmentId !== undefined ? dto.departmentId || null : user.department_id,
      lang: dto.lang ?? user.lang,
      updated_at: this.dbService.db.fn.now()
    };

    if (dto.canSubmitFiles !== undefined) {
      updatePayload.can_submit_files = dto.canSubmitFiles;
    }

    await this.dbService.db("users").update(updatePayload).where({ id });

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
    const actor = await this.getActorRole(actorId);
    const user = await this.dbService.db("users")
      .leftJoin("roles", "roles.id", "users.role_id")
      .select("users.*", "roles.level as role_level")
      .where("users.id", id)
      .first();
    if (!user) throw new NotFoundException();
    this.assertCanManageRole(actor, { level: user.role_level });

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
    const actor = await this.getActorRole(actorId);
    const user = await this.dbService.db("users")
      .leftJoin("roles", "roles.id", "users.role_id")
      .select("users.*", "roles.level as role_level")
      .where("users.id", id)
      .first();
    if (!user) throw new NotFoundException();
    this.assertCanManageRole(actor, { level: user.role_level });

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
    const actor = await this.getActorRole(actorId);
    const user = await this.dbService.db("users")
      .leftJoin("roles", "roles.id", "users.role_id")
      .select("users.*", "roles.level as role_level")
      .where("users.id", id)
      .first();
    if (!user) throw new NotFoundException();
    this.assertCanManageRole(actor, { level: user.role_level });

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
