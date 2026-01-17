import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../../db/database.service";
import { buildPaginationMeta } from "../../common/utils/pagination";
import { AuditService } from "../audit/audit.service";

const MAX_DEPTH = 10;

@Injectable()
export class DepartmentsService {
  constructor(
    private readonly dbService: DatabaseService,
    private readonly auditService: AuditService
  ) {}

  async list(params: { page: number; pageSize: number; q?: string }) {
    const { page, pageSize, q } = params;
    const query = this.dbService.db("departments")
      .select("id", "name", "parent_id", "depth", "created_at")
      .orderBy("depth", "asc")
      .orderBy("id", "asc");

    if (q) {
      query.whereILike("name", `%${q}%`);
    }

    const countResult = await query
      .clone()
      .clearSelect()
      .clearOrder()
      .count<{ count: string }>("departments.id as count")
      .first();
    const data = await query.offset((page - 1) * pageSize).limit(pageSize);

    let countsById = new Map<number, number>();
    let ownCountsById = new Map<number, number>();
    if (data.length > 0) {
      const ids = data.map((item: any) => item.id);
      const result = await this.dbService.db.raw(
        `WITH RECURSIVE tree AS (
          SELECT d.id as root_id, d.id as id
          FROM departments d
          WHERE d.id = ANY(?::int[])
          UNION ALL
          SELECT t.root_id, d.id
          FROM tree t
          JOIN departments d ON d.parent_id = t.id
        )
        SELECT root_id, COUNT(u.id)::int AS data_count
        FROM tree t
        LEFT JOIN users u ON u.department_id = t.id
        GROUP BY root_id`,
        [ids]
      );
      const rows = result?.rows || [];
      countsById = new Map(rows.map((row: any) => [Number(row.root_id), Number(row.data_count || 0)]));

      const directRows = (await this.dbService.db("users")
        .select("department_id")
        .count<{ count: string }>("id as count")
        .whereIn("department_id", ids)
        .groupBy("department_id")) as any[];
      ownCountsById = new Map(
        (directRows || []).map((row: any) => [Number(row.department_id), Number(row.count || 0)])
      );
    }

    const dataWithCounts = data.map((item: any) => ({
      ...item,
      dataCount: countsById.get(item.id) || 0,
      dataOwnCount: ownCountsById.get(item.id) || 0
    }));

    return { data: dataWithCounts, meta: buildPaginationMeta(page, pageSize, Number(countResult?.count || 0)) };
  }

  async listOptions(params: { page: number; pageSize: number; q?: string }) {
    const { page, pageSize, q } = params;
    const query = this.dbService.db("departments")
      .select("id", "name", "parent_id", "depth")
      .orderBy("name", "asc");

    if (q) {
      query.whereILike("name", `%${q}%`);
    }

    const countResult = await query
      .clone()
      .clearSelect()
      .clearOrder()
      .count<{ count: string }>("departments.id as count")
      .first();
    const data = await query.offset((page - 1) * pageSize).limit(pageSize);

    return { data, meta: buildPaginationMeta(page, pageSize, Number(countResult?.count || 0)) };
  }

  async create(dto: { name: string; parentId?: number | null }, actorId: number) {
    return this.dbService.db.transaction(async (trx) => {
      let depth = 1;
      if (dto.parentId) {
        const parent = await trx("departments").where({ id: dto.parentId }).first();
        if (!parent) throw new BadRequestException("Parent not found");
        depth = parent.depth + 1;
      }

      if (depth > MAX_DEPTH) {
        throw new BadRequestException("Max depth exceeded");
      }

      const [id] = await trx("departments")
        .insert({
          name: dto.name,
          parent_id: dto.parentId || null,
          depth,
          created_at: trx.fn.now(),
          updated_at: trx.fn.now()
        })
        .returning("id");

      await this.auditService.log({
        actorUserId: actorId,
        action: "DEPARTMENT_CREATED",
        entityType: "DEPARTMENT",
        entityId: id.id || id,
        diff: { after: { name: dto.name, parentId: dto.parentId || null } }
      });

      return { id: id.id || id };
    });
  }

  async update(id: number, dto: { name?: string; parentId?: number | null }, actorId: number) {
    return this.dbService.db.transaction(async (trx) => {
      const current = await trx("departments").where({ id }).first();
      if (!current) throw new NotFoundException();

      let newDepth = current.depth;
      let newParentId = current.parent_id;

      if (dto.parentId !== undefined) {
        newParentId = dto.parentId || null;
        if (newParentId) {
          const parent = await trx("departments").where({ id: newParentId }).first();
          if (!parent) throw new BadRequestException("Parent not found");
          newDepth = parent.depth + 1;
        } else {
          newDepth = 1;
        }

        if (newDepth > MAX_DEPTH) {
          throw new BadRequestException("Max depth exceeded");
        }

        const descendants = await trx
          .raw(
            `WITH RECURSIVE tree AS (
              SELECT id, depth FROM departments WHERE id = ?
              UNION ALL
              SELECT d.id, d.depth FROM departments d
              INNER JOIN tree t ON d.parent_id = t.id
            )
            SELECT id, depth FROM tree`,
            [id]
          )
          .then((res: any) => res.rows || []);

        if (newParentId && descendants.some((d: any) => d.id === newParentId)) {
          throw new BadRequestException("Invalid parent");
        }

        const maxDepth = Math.max(...descendants.map((d: any) => d.depth));
        const diff = newDepth - current.depth;
        if (maxDepth + diff > MAX_DEPTH) {
          throw new BadRequestException("Max depth exceeded");
        }

        if (diff !== 0) {
          const ids = descendants.map((d: any) => d.id);
          await trx("departments").whereIn("id", ids).update({
            depth: trx.raw("depth + ?", [diff])
          });
        }
      }

      await trx("departments").update({
        name: dto.name ?? current.name,
        parent_id: newParentId,
        depth: newDepth,
        updated_at: trx.fn.now()
      }).where({ id });

      await this.auditService.log({
        actorUserId: actorId,
        action: "DEPARTMENT_UPDATED",
        entityType: "DEPARTMENT",
        entityId: id,
        diff: { before: { name: current.name }, after: { name: dto.name ?? current.name } }
      });

      return { success: true };
    });
  }

  async remove(id: number, actorId: number) {
    const hasChildren = await this.dbService.db("departments").where({ parent_id: id }).first();
    if (hasChildren) {
      throw new BadRequestException("Department has children");
    }

    const dataResult = await this.dbService.db.raw(
      `WITH RECURSIVE tree AS (
        SELECT id FROM departments WHERE id = ?
        UNION ALL
        SELECT d.id FROM departments d
        JOIN tree t ON d.parent_id = t.id
      )
      SELECT COUNT(u.id)::int AS data_count
      FROM tree t
      LEFT JOIN users u ON u.department_id = t.id`,
      [id]
    );
    const dataCount = Number(dataResult?.rows?.[0]?.data_count || 0);
    if (dataCount > 0) {
      throw new BadRequestException("Department has data");
    }

    await this.dbService.db("departments").where({ id }).delete();

    await this.auditService.log({
      actorUserId: actorId,
      action: "DEPARTMENT_DELETED",
      entityType: "DEPARTMENT",
      entityId: id
    });

    return { success: true };
  }
}
