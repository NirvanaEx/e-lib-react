import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../../db/database.service";
import { buildPaginationMeta } from "../../common/utils/pagination";
import { AuditService } from "../audit/audit.service";

@Injectable()
export class PositionsService {
  constructor(
    private readonly dbService: DatabaseService,
    private readonly auditService: AuditService
  ) {}

  /**
   * Названия должностей уникальны без учёта регистра — иначе справочник
   * повторит разнобой старой библиотеки, где «инженер» и «Инженер» жили
   * как две разные записи.
   */
  private async assertNameFree(name: string, exceptId?: number) {
    const query = this.dbService
      .db("positions")
      .whereRaw("lower(name) = lower(?)", [name.trim()]);
    if (exceptId) {
      query.whereNot({ id: exceptId });
    }
    const existing = await query.first();
    if (existing) {
      throw new BadRequestException({
        code: "POSITION_NAME_TAKEN",
        message: "Position name already exists"
      });
    }
  }

  async list(params: { page: number; pageSize: number; q?: string }) {
    const { page, pageSize, q } = params;
    const query = this.dbService
      .db("positions")
      .select("id", "name", "created_at", "updated_at")
      .orderBy("name", "asc");

    if (q) {
      query.whereILike("name", `%${q}%`);
    }

    const countResult = await query
      .clone()
      .clearSelect()
      .clearOrder()
      .count<{ count: string }>("positions.id as count")
      .first();
    const data = await query.offset((page - 1) * pageSize).limit(pageSize);

    let countsById = new Map<number, number>();
    if (data.length > 0) {
      const ids = data.map((item: any) => item.id);
      const rows = (await this.dbService
        .db("users")
        .select("position_id")
        .count<{ count: string }>("id as count")
        .whereIn("position_id", ids)
        .whereNull("deleted_at")
        .groupBy("position_id")) as any[];
      countsById = new Map(
        (rows || []).map((row: any) => [Number(row.position_id), Number(row.count || 0)])
      );
    }

    const dataWithCounts = data.map((item: any) => ({
      ...item,
      dataCount: countsById.get(item.id) || 0
    }));

    return {
      data: dataWithCounts,
      meta: buildPaginationMeta(page, pageSize, Number(countResult?.count || 0))
    };
  }

  async listOptions(params: { page: number; pageSize: number; q?: string }) {
    const { page, pageSize, q } = params;
    const query = this.dbService.db("positions").select("id", "name").orderBy("name", "asc");

    if (q) {
      query.whereILike("name", `%${q}%`);
    }

    const countResult = await query
      .clone()
      .clearSelect()
      .clearOrder()
      .count<{ count: string }>("positions.id as count")
      .first();
    const data = await query.offset((page - 1) * pageSize).limit(pageSize);

    return { data, meta: buildPaginationMeta(page, pageSize, Number(countResult?.count || 0)) };
  }

  async create(dto: { name: string }, actorId: number) {
    const name = dto.name.trim();
    await this.assertNameFree(name);

    const [inserted] = await this.dbService
      .db("positions")
      .insert({
        name,
        created_at: this.dbService.db.fn.now(),
        updated_at: this.dbService.db.fn.now()
      })
      .returning("id");

    const id = inserted?.id || inserted;

    await this.auditService.log({
      actorUserId: actorId,
      action: "POSITION_CREATED",
      entityType: "POSITION",
      entityId: id,
      diff: { after: { name } }
    });

    return { id };
  }

  async update(id: number, dto: { name?: string }, actorId: number) {
    const current = await this.dbService.db("positions").where({ id }).first();
    if (!current) throw new NotFoundException();

    const name = dto.name !== undefined ? dto.name.trim() : current.name;
    if (name !== current.name) {
      await this.assertNameFree(name, id);
    }

    await this.dbService
      .db("positions")
      .update({ name, updated_at: this.dbService.db.fn.now() })
      .where({ id });

    await this.auditService.log({
      actorUserId: actorId,
      action: "POSITION_UPDATED",
      entityType: "POSITION",
      entityId: id,
      diff: { before: { name: current.name }, after: { name } }
    });

    return { success: true };
  }

  async remove(id: number, actorId: number) {
    const current = await this.dbService.db("positions").where({ id }).first();
    if (!current) throw new NotFoundException();

    // Удалённые пользователи не держат должность: их запись всё равно скрыта.
    const usersResult = await this.dbService
      .db("users")
      .where({ position_id: id })
      .whereNull("deleted_at")
      .count<{ count: string }>("id as count")
      .first();
    const userCount = Number(usersResult?.count || 0);
    if (userCount > 0) {
      throw new BadRequestException({
        code: "POSITION_HAS_USERS",
        message: "Position is still assigned to users",
        userCount
      });
    }

    await this.dbService.db("positions").where({ id }).delete();

    await this.auditService.log({
      actorUserId: actorId,
      action: "POSITION_DELETED",
      entityType: "POSITION",
      entityId: id,
      diff: { before: { name: current.name } }
    });

    return { success: true };
  }
}
