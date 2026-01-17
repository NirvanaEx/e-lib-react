import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DatabaseService } from "../../db/database.service";
import { buildPaginationMeta } from "../../common/utils/pagination";
import { getAvailableLangs, normalizeLang, selectTranslation, Lang } from "../../common/utils/lang";
import { AuditService } from "../audit/audit.service";

type CategoryTranslation = { lang: Lang; title: string };

const MAX_DEPTH = 10;

@Injectable()
export class CategoriesService {
  constructor(
    private readonly dbService: DatabaseService,
    private readonly config: ConfigService,
    private readonly auditService: AuditService
  ) {}

  async list(params: { page: number; pageSize: number; q?: string; sectionId?: number }, preferredLang: string | null) {
    const { page, pageSize, q, sectionId } = params;
    const baseQuery = this.dbService.db("categories")
      .leftJoin(
        "categories_translations",
        "categories.id",
        "categories_translations.category_id"
      )
      .select(
        "categories.id",
        "categories.section_id",
        "categories.parent_id",
        "categories.depth",
        "categories_translations.lang",
        "categories_translations.title"
      )
      .orderBy("categories.id", "desc");

    if (sectionId) {
      baseQuery.where("categories.section_id", sectionId);
    }
    if (q) {
      baseQuery.whereILike("categories_translations.title", `%${q}%`);
    }

    const countResult = await baseQuery
      .clone()
      .clearSelect()
      .clearOrder()
      .countDistinct<{ count: string }>("categories.id as count")
      .first();

    const rows = await baseQuery.offset((page - 1) * pageSize).limit(pageSize);

    type CategoryRow = {
      id: number;
      section_id: number;
      parent_id: number | null;
      depth: number;
      translations: CategoryTranslation[];
    };

    const grouped = new Map<number, CategoryRow>();
    rows.forEach((row: any) => {
      if (!grouped.has(row.id)) {
        grouped.set(row.id, {
          id: row.id,
          section_id: row.section_id,
          parent_id: row.parent_id,
          depth: row.depth,
          translations: []
        });
      }
      const current = grouped.get(row.id);
      if (row.lang && current) {
        current.translations.push({ lang: row.lang, title: row.title });
      }
    });

    const defaultLang = normalizeLang(this.config.get<string>("DEFAULT_DATA_LANG", "ru")) || "ru";
    const lang = normalizeLang(preferredLang) || null;

    const data = Array.from(grouped.values()).map((item) => {
      const picked = selectTranslation<CategoryTranslation>(item.translations, lang, defaultLang);
      return {
        id: item.id,
        sectionId: item.section_id,
        parentId: item.parent_id,
        depth: item.depth,
        title: picked?.title || null,
        availableLangs: getAvailableLangs(item.translations)
      };
    });

    return { data, meta: buildPaginationMeta(page, pageSize, Number(countResult?.count || 0)) };
  }

  async getOne(id: number, preferredLang: string | null) {
    const rows = await this.dbService.db("categories")
      .leftJoin(
        "categories_translations",
        "categories.id",
        "categories_translations.category_id"
      )
      .select(
        "categories.id",
        "categories.section_id",
        "categories.parent_id",
        "categories.depth",
        "categories_translations.lang",
        "categories_translations.title"
      )
      .where("categories.id", id);

    if (!rows.length) throw new NotFoundException();

    const base = rows[0];
    const translations: CategoryTranslation[] = rows
      .filter((row) => row.lang)
      .map((row) => ({ lang: row.lang as Lang, title: row.title }));

    const defaultLang = normalizeLang(this.config.get<string>("DEFAULT_DATA_LANG", "ru")) || "ru";
    const lang = normalizeLang(preferredLang) || null;
    const picked = selectTranslation<CategoryTranslation>(translations, lang, defaultLang);

    return {
      id,
      sectionId: base.section_id,
      parentId: base.parent_id,
      depth: base.depth,
      title: picked?.title || null,
      availableLangs: getAvailableLangs(translations),
      translations
    };
  }

  async create(dto: any, actorId: number) {
    return this.dbService.db.transaction(async (trx) => {
      let depth = 1;
      if (dto.parentId) {
        const parent = await trx("categories").where({ id: dto.parentId }).first();
        if (!parent) throw new BadRequestException("Parent not found");
        if (parent.section_id !== dto.sectionId) {
          throw new BadRequestException("Parent is in another section");
        }
        depth = parent.depth + 1;
      }
      if (depth > MAX_DEPTH) throw new BadRequestException("Max depth exceeded");

      const [id] = await trx("categories")
        .insert({
          section_id: dto.sectionId,
          parent_id: dto.parentId || null,
          depth,
          created_at: trx.fn.now(),
          updated_at: trx.fn.now()
        })
        .returning("id");

      const rows = dto.translations.map((t: any) => ({
        category_id: id.id || id,
        lang: t.lang,
        title: t.title
      }));
      await trx("categories_translations").insert(rows);

      await this.auditService.log({
        actorUserId: actorId,
        action: "CATEGORY_CREATED",
        entityType: "CATEGORY",
        entityId: id.id || id
      });

      return { id: id.id || id };
    });
  }

  async update(id: number, dto: any, actorId: number) {
    return this.dbService.db.transaction(async (trx) => {
      const current = await trx("categories").where({ id }).first();
      if (!current) throw new NotFoundException();

      let newDepth = current.depth;
      let newParentId = current.parent_id;

      if (dto.parentId !== undefined) {
        newParentId = dto.parentId || null;
        if (newParentId) {
          const parent = await trx("categories").where({ id: newParentId }).first();
          if (!parent) throw new BadRequestException("Parent not found");
          if (parent.section_id !== current.section_id) {
            throw new BadRequestException("Parent is in another section");
          }
          newDepth = parent.depth + 1;
        } else {
          newDepth = 1;
        }

        if (newDepth > MAX_DEPTH) throw new BadRequestException("Max depth exceeded");

        const descendants = await trx
          .raw(
            `WITH RECURSIVE tree AS (
              SELECT id, depth FROM categories WHERE id = ?
              UNION ALL
              SELECT c.id, c.depth FROM categories c
              INNER JOIN tree t ON c.parent_id = t.id
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
          await trx("categories").whereIn("id", ids).update({
            depth: trx.raw("depth + ?", [diff])
          });
        }
      }

      await trx("categories").update({
        parent_id: newParentId,
        depth: newDepth,
        updated_at: trx.fn.now()
      }).where({ id });

      if (dto.translations && dto.translations.length > 0) {
        await trx("categories_translations").where({ category_id: id }).delete();
        const rows = dto.translations.map((t: any) => ({
          category_id: id,
          lang: t.lang,
          title: t.title
        }));
        await trx("categories_translations").insert(rows);
      }

      await this.auditService.log({
        actorUserId: actorId,
        action: "CATEGORY_UPDATED",
        entityType: "CATEGORY",
        entityId: id
      });

      return { success: true };
    });
  }

  async remove(id: number, actorId: number) {
    const hasChildren = await this.dbService.db("categories").where({ parent_id: id }).first();
    if (hasChildren) {
      throw new BadRequestException("Category has children");
    }

    await this.dbService.db("categories_translations").where({ category_id: id }).delete();
    await this.dbService.db("categories").where({ id }).delete();

    await this.auditService.log({
      actorUserId: actorId,
      action: "CATEGORY_DELETED",
      entityType: "CATEGORY",
      entityId: id
    });

    return { success: true };
  }
}
