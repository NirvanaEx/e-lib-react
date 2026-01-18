import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../../db/database.service";

@Injectable()
export class RolesService {
  constructor(private readonly dbService: DatabaseService) {}

  async list() {
    return this.dbService.db("roles").select("id", "name", "level", "created_at", "updated_at").orderBy("id");
  }

  async create(name: string, actorId: number, level?: number) {
    const actor = await this.dbService.db("users")
      .leftJoin("roles", "roles.id", "users.role_id")
      .select("roles.name as role", "roles.level as level")
      .where("users.id", actorId)
      .first();
    if (!actor || actor.role !== "superadmin") {
      throw new ForbiddenException("Only superadmin can create roles");
    }

    const trimmed = name.trim();
    const existing = await this.dbService.db("roles").whereRaw("lower(name) = lower(?)", [trimmed]).first();
    if (existing) {
      throw new BadRequestException("Role already exists");
    }

    const nextLevel = Number.isFinite(level) ? Number(level) : 1;
    if (nextLevel < 1 || nextLevel >= Number(actor.level || 0)) {
      throw new BadRequestException("Invalid role level");
    }

    const [id] = await this.dbService.db("roles").insert({ name: trimmed, level: nextLevel }).returning("id");
    return { id: id.id || id };
  }

  async listPermissions() {
    return this.dbService.db("permissions")
      .select("id", "name", "description_en", "description_ru", "description_uz")
      .orderBy("name");
  }

  async getRolePermissions(roleId: number) {
    const role = await this.dbService.db("roles").where({ id: roleId }).first();
    if (!role) throw new NotFoundException();

    const permissions = await this.dbService
      .db("role_permissions")
      .leftJoin("permissions", "permissions.id", "role_permissions.permission_id")
      .where("role_permissions.role_id", roleId)
      .orderBy("permissions.name", "asc")
      .pluck("permissions.name");

    return { roleId, permissions };
  }

  async updateRolePermissions(roleId: number, permissionNames: string[], actorId: number) {
    const actor = await this.dbService.db("users")
      .leftJoin("roles", "roles.id", "users.role_id")
      .select("roles.name as role", "roles.level as level")
      .where("users.id", actorId)
      .first();
    if (!actor || actor.role !== "superadmin") {
      throw new ForbiddenException("Only superadmin can update roles");
    }

    const role = await this.dbService.db("roles").where({ id: roleId }).first();
    if (!role) throw new NotFoundException();

    const permissions = permissionNames.length
      ? await this.dbService.db("permissions").whereIn("name", permissionNames).select("id", "name")
      : [];

    if (permissions.length !== permissionNames.length) {
      const found = new Set(permissions.map((perm) => perm.name));
      const missing = permissionNames.filter((name) => !found.has(name));
      throw new BadRequestException(`Unknown permissions: ${missing.join(", ")}`);
    }

    await this.dbService.db.transaction(async (trx) => {
      await trx("role_permissions").where({ role_id: roleId }).delete();
      if (permissions.length > 0) {
        await trx("role_permissions").insert(
          permissions.map((perm) => ({
            role_id: roleId,
            permission_id: perm.id
          }))
        );
      }
    });

    return { success: true };
  }
}
