import { BadRequestException, Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import path from "path";
import fs from "fs/promises";
import { v4 as uuidv4 } from "uuid";
import { DatabaseService } from "../../db/database.service";
import { AuditService } from "../audit/audit.service";
import { DownloadsService } from "../downloads/downloads.service";
import { buildPaginationMeta } from "../../common/utils/pagination";
import { getAvailableLangs, normalizeLang, selectTranslation, Lang } from "../../common/utils/lang";

type FileTranslation = { lang: Lang; title: string; description?: string | null };

@Injectable()
export class FilesService {
  constructor(
    private readonly dbService: DatabaseService,
    private readonly config: ConfigService,
    private readonly auditService: AuditService,
    private readonly downloadsService: DownloadsService
  ) {}

  private getDefaultLang(): Lang {
    return normalizeLang(this.config.get<string>("DEFAULT_DATA_LANG", "ru")) || "ru";
  }

  private getUploadDir() {
    const dir = this.config.get<string>("UPLOAD_DIR", "uploads");
    return path.isAbsolute(dir) ? dir : path.resolve(process.cwd(), dir);
  }

  private async ensureUploadDir(dir: string) {
    await fs.mkdir(dir, { recursive: true });
  }

  private async getDepartmentScopeIds(departmentId: number | null) {
    if (!departmentId) return [];
    const result = await this.dbService.db.raw(
      `WITH RECURSIVE tree AS (
        SELECT id FROM departments WHERE id = ?
        UNION ALL
        SELECT d.id FROM departments d
        JOIN tree t ON d.parent_id = t.id
      )
      SELECT id FROM tree`,
      [departmentId]
    );
    const rows = result?.rows || [];
    return rows.map((row: any) => Number(row.id));
  }

  private async getDepartmentPaths(ids: number[]) {
    if (!ids.length) return new Map<number, string>();
    const result = await this.dbService.db.raw(
      `WITH RECURSIVE tree AS (
        SELECT d.id as root_id, d.id, d.name, d.parent_id, d.depth
        FROM departments d
        WHERE d.id = ANY(?::int[])
        UNION ALL
        SELECT t.root_id, d.id, d.name, d.parent_id, d.depth
        FROM tree t
        JOIN departments d ON d.id = t.parent_id
      )
      SELECT root_id, name, depth FROM tree`,
      [ids]
    );
    const rows = result?.rows || [];
    const grouped = new Map<number, { name: string; depth: number }[]>();
    rows.forEach((row: any) => {
      const rootId = Number(row.root_id);
      const name = row.name;
      const depth = Number(row.depth);
      if (!name || !Number.isFinite(rootId) || !Number.isFinite(depth)) return;
      if (!grouped.has(rootId)) grouped.set(rootId, []);
      grouped.get(rootId)?.push({ name, depth });
    });
    const paths = new Map<number, string>();
    grouped.forEach((items, rootId) => {
      items.sort((a, b) => a.depth - b.depth);
      paths.set(rootId, items.map((item) => item.name).join("/"));
    });
    return paths;
  }

  private async getCategoryScopeIds(categoryId: number | null) {
    if (!categoryId) return [];
    const result = await this.dbService.db.raw(
      `WITH RECURSIVE tree AS (
        SELECT id FROM categories WHERE id = ?
        UNION ALL
        SELECT c.id FROM categories c
        JOIN tree t ON c.parent_id = t.id
      )
      SELECT id FROM tree`,
      [categoryId]
    );
    const rows = result?.rows || [];
    return rows.map((row: any) => Number(row.id)).filter((id: number) => Number.isFinite(id));
  }

  private buildMenu(sectionsRows: any[], categoriesRows: any[], preferredLang: string | null) {
    const defaultLang = this.getDefaultLang();
    const lang = normalizeLang(preferredLang) || null;

    type MenuTranslation = { lang: Lang; title: string };
    type MenuSection = { id: number; translations: MenuTranslation[] };
    type MenuCategory = { id: number; parentId: number | null; depth: number; translations: MenuTranslation[] };

    const groupSections = new Map<number, MenuSection>();
    sectionsRows.forEach((row: any) => {
      if (!groupSections.has(row.id)) {
        groupSections.set(row.id, { id: row.id, translations: [] });
      }
      const current = groupSections.get(row.id);
      if (row.lang && current) {
        current.translations.push({ lang: row.lang, title: row.title });
      }
    });
    const sections = Array.from(groupSections.values()).map((s) => {
      const picked = selectTranslation<MenuTranslation>(s.translations, lang, defaultLang);
      return { id: s.id, title: picked?.title || null, availableLangs: getAvailableLangs(s.translations) };
    });

    const groupCategories = new Map<number, MenuCategory>();
    categoriesRows.forEach((row: any) => {
      if (!groupCategories.has(row.id)) {
        groupCategories.set(row.id, {
          id: row.id,
          parentId: row.parent_id,
          depth: row.depth,
          translations: []
        });
      }
      const current = groupCategories.get(row.id);
      if (row.lang && current) {
        current.translations.push({ lang: row.lang, title: row.title });
      }
    });
    const categories = Array.from(groupCategories.values()).map((c) => {
      const picked = selectTranslation<MenuTranslation>(c.translations, lang, defaultLang);
      return {
        id: c.id,
        parentId: c.parentId,
        depth: c.depth,
        title: picked?.title || null,
        availableLangs: getAvailableLangs(c.translations)
      };
    });

    return { sections, categories };
  }

  private async deleteFileSafe(filePath: string) {
    try {
      await fs.unlink(filePath);
    } catch (_err) {
      return;
    }
  }

  private getDateParts(date = new Date()) {
    const year = String(date.getFullYear());
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return { year, month, day };
  }

  private sanitizeFileName(originalName: string) {
    const base = path.basename(originalName || "");
    const safe = base.replace(/[<>:"/\\|?*]+/g, "_").replace(/\s+/g, " ").trim();
    return safe || `${uuidv4()}`;
  }

  private async ensureUniquePath(targetPath: string) {
    const parsed = path.parse(targetPath);
    let candidate = targetPath;
    let counter = 1;
    while (true) {
      try {
        await fs.access(candidate);
        candidate = path.join(parsed.dir, `${parsed.name}_${counter}${parsed.ext}`);
        counter += 1;
      } catch (_err) {
        return candidate;
      }
    }
  }

  private async buildAssetPath(originalName: string) {
    const safeName = this.sanitizeFileName(originalName);
    const { year, month, day } = this.getDateParts();
    const dir = path.join(this.getUploadDir(), year, month, day);
    const rawPath = path.join(dir, safeName);
    return this.ensureUniquePath(rawPath);
  }

  private async validateAccess(user: any, fileItemId: number) {
    const file = await this.dbService.db("file_items")
      .select("id", "access_type")
      .where({ id: fileItemId })
      .whereNull("deleted_at")
      .first();
    if (!file) throw new NotFoundException();
    if (file.access_type === "public") return;
    if (user?.permissions?.includes("file.download.restricted")) return;

    const departmentIds = await this.getDepartmentScopeIds(user.departmentId);
    const hasDept = departmentIds.length
      ? await this.dbService.db("file_access_departments")
          .where({ file_item_id: fileItemId })
          .whereIn("department_id", departmentIds)
          .first()
      : null;
    const hasUser = await this.dbService.db("file_access_users")
      .where({ file_item_id: fileItemId, user_id: user.id })
      .first();

    if (!hasDept && !hasUser) {
      throw new ForbiddenException("Access denied");
    }
  }

  async listManage(
    params: { page: number; pageSize: number; q?: string; sortBy?: string; sortDir?: string; createdBy?: number },
    preferredLang: string | null
  ) {
    const { page, pageSize, q, sortBy, sortDir, createdBy } = params;
    const db = this.dbService.db;
    const defaultLang = this.getDefaultLang();
    const lang = normalizeLang(preferredLang) || null;
    const sortLang = lang || defaultLang;
    const query = db("file_items")
      .leftJoin("file_translations", "file_items.id", "file_translations.file_item_id")
      .leftJoin("file_versions", "file_items.current_version_id", "file_versions.id")
      .select(
        "file_items.id",
        "file_items.section_id",
        "file_items.category_id",
        "file_items.access_type",
        "file_items.current_version_id",
        "file_items.deleted_at",
        "file_items.created_at",
        "file_items.updated_at",
        "file_translations.lang",
        "file_translations.title",
        "file_translations.description"
      )
      .whereNull("file_items.deleted_at");

    if (createdBy) {
      query.where("file_items.created_by", createdBy);
    }

    if (q) {
      query.whereILike("file_translations.title", `%${q}%`);
    }

    const direction = sortDir === "asc" ? "asc" : "desc";
    if (sortBy === "title") {
      query.leftJoin({ sort_title_pref: "file_translations" }, function () {
        this.on("file_items.id", "sort_title_pref.file_item_id").andOn("sort_title_pref.lang", db.raw("?", [sortLang]));
      });
      if (sortLang !== defaultLang) {
        query.leftJoin({ sort_title_def: "file_translations" }, function () {
          this.on("file_items.id", "sort_title_def.file_item_id").andOn("sort_title_def.lang", db.raw("?", [defaultLang]));
        });
      }
      if (sortLang !== defaultLang) {
        query.orderByRaw(`coalesce(??, ??) ${direction}`, ["sort_title_pref.title", "sort_title_def.title"]);
      } else {
        query.orderByRaw(`?? ${direction}`, ["sort_title_pref.title"]);
      }
    } else if (sortBy === "category") {
      query.leftJoin("categories", "file_items.category_id", "categories.id");
      query.leftJoin({ sort_cat_pref: "categories_translations" }, function () {
        this.on("categories.id", "sort_cat_pref.category_id").andOn("sort_cat_pref.lang", db.raw("?", [sortLang]));
      });
      if (sortLang !== defaultLang) {
        query.leftJoin({ sort_cat_def: "categories_translations" }, function () {
          this.on("categories.id", "sort_cat_def.category_id").andOn("sort_cat_def.lang", db.raw("?", [defaultLang]));
        });
      }
      if (sortLang !== defaultLang) {
        query.orderByRaw(`coalesce(??, ??) ${direction}`, ["sort_cat_pref.title", "sort_cat_def.title"]);
      } else {
        query.orderByRaw(`?? ${direction}`, ["sort_cat_pref.title"]);
      }
    } else if (sortBy === "size") {
      const sizeTotals = db("file_version_assets")
        .select("file_version_id")
        .sum<{ size: string }>("size as size")
        .groupBy("file_version_id")
        .as("size_totals");
      query.leftJoin(sizeTotals, "size_totals.file_version_id", "file_items.current_version_id");
      query.leftJoin({ size_pref: "file_version_assets" }, function () {
        this.on("size_pref.file_version_id", "file_items.current_version_id").andOn("size_pref.lang", db.raw("?", [sortLang]));
      });
      query.orderByRaw(`coalesce(??, ??, 0) ${direction}`, ["size_pref.size", "size_totals.size"]);
    } else if (sortBy === "updated_at") {
      query.orderBy("file_items.updated_at", direction);
    } else {
      query.orderBy("file_items.created_at", direction);
    }

    const countResult = await query
      .clone()
      .clearSelect()
      .clearOrder()
      .countDistinct<{ count: string }>("file_items.id as count")
      .first();
    const rows = await query.offset((page - 1) * pageSize).limit(pageSize);

    type FileRow = {
      id: number;
      section_id: number;
      category_id: number;
      access_type: string;
      current_version_id: number | null;
      created_at: string;
      updated_at: string;
      translations: FileTranslation[];
    };

    const grouped = new Map<number, FileRow>();
    rows.forEach((row: any) => {
      if (!grouped.has(row.id)) {
        grouped.set(row.id, {
          id: row.id,
          section_id: row.section_id,
          category_id: row.category_id,
          access_type: row.access_type,
          current_version_id: row.current_version_id,
          created_at: row.created_at,
          updated_at: row.updated_at,
          translations: []
        });
      }
      const current = grouped.get(row.id);
      if (row.lang && current) {
        current.translations.push({
          lang: row.lang,
          title: row.title,
          description: row.description
        });
      }
    });

    const baseData = Array.from(grouped.values()).map((item) => {
      const picked = selectTranslation<FileTranslation>(item.translations, lang, defaultLang);
      return {
        id: item.id,
        sectionId: item.section_id,
        categoryId: item.category_id,
        accessType: item.access_type,
        currentVersionId: item.current_version_id,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        title: picked?.title || null,
        description: picked?.description || null,
        availableLangs: getAvailableLangs(item.translations)
      };
    });

    const versionIds = baseData.map((item) => item.currentVersionId).filter(Boolean) as number[];
    const assetLangsByVersion = new Map<number, Set<string>>();
    const assetSizesByVersion = new Map<number, number>();
    const assetSizesByLang = new Map<number, Map<string, number>>();
    if (versionIds.length > 0) {
      const assetRows = await this.dbService.db("file_version_assets")
        .select("file_version_id", "lang", "size")
        .whereIn("file_version_id", versionIds)
        .whereNull("deleted_at");
      assetRows.forEach((row: any) => {
        if (!assetLangsByVersion.has(row.file_version_id)) {
          assetLangsByVersion.set(row.file_version_id, new Set<string>());
        }
        assetLangsByVersion.get(row.file_version_id)?.add(row.lang);
        if (!assetSizesByLang.has(row.file_version_id)) {
          assetSizesByLang.set(row.file_version_id, new Map<string, number>());
        }
        assetSizesByLang.get(row.file_version_id)?.set(row.lang, Number(row.size || 0));
      });

      const sizeRows = (await this.dbService.db("file_version_assets")
        .select("file_version_id")
        .sum<{ size: string }>("size as size")
        .whereIn("file_version_id", versionIds)
        .whereNull("deleted_at")
        .groupBy("file_version_id")) as any[];
      sizeRows.forEach((row: any) => {
        assetSizesByVersion.set(row.file_version_id, Number(row.size || 0));
      });
    }

    const data = baseData.map((item) => {
      const langs = item.currentVersionId ? Array.from(assetLangsByVersion.get(item.currentVersionId) || []) : [];
      const sizes =
        item.currentVersionId && assetSizesByLang.has(item.currentVersionId)
          ? Array.from(assetSizesByLang.get(item.currentVersionId) || new Map()).map(([lang, size]) => ({
              lang,
              size
            }))
          : [];
      return {
        ...item,
        availableAssetLangs: langs.sort(),
        availableAssetSizes: sizes.sort((a, b) => a.lang.localeCompare(b.lang)),
        currentAssetSize: item.currentVersionId ? assetSizesByVersion.get(item.currentVersionId) || 0 : 0
      };
    });

    return {
      data,
      meta: buildPaginationMeta(page, pageSize, Number(countResult?.count || 0))
    };
  }

  async getManage(fileItemId: number, preferredLang: string | null) {
    const rows = await this.dbService.db("file_items")
      .leftJoin("file_translations", "file_items.id", "file_translations.file_item_id")
      .select(
        "file_items.id",
        "file_items.section_id",
        "file_items.category_id",
        "file_items.access_type",
        "file_items.current_version_id",
        "file_items.created_by",
        "file_items.deleted_at",
        "file_translations.lang",
        "file_translations.title",
        "file_translations.description"
      )
      .where("file_items.id", fileItemId);

    if (!rows.length) throw new NotFoundException();

    const base = rows[0];
    const translations: FileTranslation[] = rows
      .filter((r) => r.lang)
      .map((r) => ({ lang: r.lang as Lang, title: r.title, description: r.description }));

    const accessDepartments = await this.dbService.db("file_access_departments")
      .where({ file_item_id: fileItemId })
      .pluck("department_id");
    const accessUsers = await this.dbService.db("file_access_users")
      .where({ file_item_id: fileItemId })
      .pluck("user_id");

    const defaultLang = this.getDefaultLang();
    const lang = normalizeLang(preferredLang) || null;
    const picked = selectTranslation<FileTranslation>(translations, lang, defaultLang);

    return {
      id: base.id,
      sectionId: base.section_id,
      categoryId: base.category_id,
      accessType: base.access_type,
      currentVersionId: base.current_version_id,
      title: picked?.title || null,
      description: picked?.description || null,
      availableLangs: getAvailableLangs(translations),
      translations,
      accessDepartmentIds: accessDepartments,
      accessUserIds: accessUsers
    };
  }

  async create(dto: any, actorId: number) {
    if (!dto.translations || dto.translations.length === 0) {
      throw new BadRequestException("Translations required");
    }

    return this.dbService.db.transaction(async (trx) => {
      const section = await trx("sections").where({ id: dto.sectionId }).first();
      if (!section) throw new BadRequestException("Section not found");
      const category = await trx("categories").where({ id: dto.categoryId }).first();
      if (!category) throw new BadRequestException("Category not found");

      const [fileItem] = await trx("file_items")
        .insert({
          section_id: dto.sectionId,
          category_id: dto.categoryId,
          access_type: dto.accessType,
          created_by: actorId,
          created_at: trx.fn.now(),
          updated_at: trx.fn.now()
        })
        .returning("id");

      const fileItemId = fileItem.id || fileItem;

      const [version] = await trx("file_versions")
        .insert({
          file_item_id: fileItemId,
          version_number: 1,
          comment: null,
          created_by: actorId,
          created_at: trx.fn.now(),
          updated_at: trx.fn.now()
        })
        .returning("id");

      const versionId = version.id || version;

      await trx("file_items").update({ current_version_id: versionId }).where({ id: fileItemId });

      const translations = dto.translations.map((t: any) => ({
        file_item_id: fileItemId,
        lang: t.lang,
        title: t.title,
        description: t.description || null
      }));
      await trx("file_translations").insert(translations);

      if (dto.accessType === "restricted") {
        if (dto.accessDepartmentIds && dto.accessDepartmentIds.length > 0) {
          await trx("file_access_departments").insert(
            dto.accessDepartmentIds.map((id: number) => ({
              file_item_id: fileItemId,
              department_id: id
            }))
          );
        }
        if (dto.accessUserIds && dto.accessUserIds.length > 0) {
          await trx("file_access_users").insert(
            dto.accessUserIds.map((id: number) => ({
              file_item_id: fileItemId,
              user_id: id
            }))
          );
        }
      }

      await this.auditService.log({
        actorUserId: actorId,
        action: "FILE_CREATED",
        entityType: "FILE",
        entityId: fileItemId
      });

      await this.auditService.log({
        actorUserId: actorId,
        action: "FILE_VERSION_CREATED",
        entityType: "FILE_VERSION",
        entityId: versionId,
        meta: { versionNumber: 1 }
      });

      return { id: fileItemId, currentVersionId: versionId };
    });
  }

  async updateMetadata(fileItemId: number, dto: any, actorId: number) {
    return this.dbService.db.transaction(async (trx) => {
      const file = await trx("file_items").where({ id: fileItemId }).first();
      if (!file) throw new NotFoundException();

      if (dto.categoryId || dto.sectionId) {
        const sectionId = dto.sectionId ?? file.section_id;
        const categoryId = dto.categoryId ?? file.category_id;
        const section = await trx("sections").where({ id: sectionId }).first();
        if (!section) throw new BadRequestException("Section not found");
        const category = await trx("categories").where({ id: categoryId }).first();
        if (!category) throw new BadRequestException("Category not found");
        await trx("file_items")
          .update({ section_id: sectionId, category_id: categoryId, updated_at: trx.fn.now() })
          .where({ id: fileItemId });
      }

      if (dto.translations && dto.translations.length > 0) {
        await trx("file_translations").where({ file_item_id: fileItemId }).delete();
        const rows = dto.translations.map((t: any) => ({
          file_item_id: fileItemId,
          lang: t.lang,
          title: t.title,
          description: t.description || null
        }));
        await trx("file_translations").insert(rows);
      }

      await this.auditService.log({
        actorUserId: actorId,
        action: "FILE_UPDATED",
        entityType: "FILE",
        entityId: fileItemId
      });

      return { success: true };
    });
  }

  async updateAccess(fileItemId: number, dto: any, actorId: number) {
    const file = await this.dbService.db("file_items").where({ id: fileItemId }).first();
    if (!file) throw new NotFoundException();

    await this.dbService.db.transaction(async (trx) => {
      await trx("file_items")
        .update({ access_type: dto.accessType, updated_at: trx.fn.now() })
        .where({ id: fileItemId });
      await trx("file_access_departments").where({ file_item_id: fileItemId }).delete();
      await trx("file_access_users").where({ file_item_id: fileItemId }).delete();

      if (dto.accessDepartmentIds && dto.accessDepartmentIds.length > 0) {
        await trx("file_access_departments").insert(
          dto.accessDepartmentIds.map((id: number) => ({
            file_item_id: fileItemId,
            department_id: id
          }))
        );
      }
      if (dto.accessUserIds && dto.accessUserIds.length > 0) {
        await trx("file_access_users").insert(
          dto.accessUserIds.map((id: number) => ({
            file_item_id: fileItemId,
            user_id: id
          }))
        );
      }
    });

    await this.auditService.log({
      actorUserId: actorId,
      action: "FILE_ACCESS_CHANGED",
      entityType: "FILE",
      entityId: fileItemId
    });

    return { success: true };
  }

  async softDelete(fileItemId: number, actorId: number) {
    await this.dbService.db("file_items").update({ deleted_at: this.dbService.db.fn.now() }).where({ id: fileItemId });

    await this.auditService.log({
      actorUserId: actorId,
      action: "FILE_TRASHED",
      entityType: "FILE",
      entityId: fileItemId
    });

    return { success: true };
  }

  async restore(fileItemId: number, actorId: number) {
    await this.dbService.db("file_items").update({ deleted_at: null }).where({ id: fileItemId });

    await this.auditService.log({
      actorUserId: actorId,
      action: "FILE_RESTORED",
      entityType: "FILE",
      entityId: fileItemId
    });

    return { success: true };
  }

  async listTrash(params: { page: number; pageSize: number; q?: string }, preferredLang: string | null) {
    const { page, pageSize, q } = params;
    const db = this.dbService.db;
    const defaultLang = this.getDefaultLang();
    const lang = normalizeLang(preferredLang) || null;
    const resolvedLang = lang || defaultLang;

    const applyTitleJoins = (query: any, tableAlias = "file_items") => {
      query
        .leftJoin({ ft_pref: "file_translations" }, function (this: any) {
          this.on(`${tableAlias}.id`, "ft_pref.file_item_id").andOn("ft_pref.lang", db.raw("?", [resolvedLang]));
        })
        .leftJoin({ ft_def: "file_translations" }, function (this: any) {
          this.on(`${tableAlias}.id`, "ft_def.file_item_id").andOn("ft_def.lang", db.raw("?", [defaultLang]));
        });
    };

    const filesQuery = db("file_items")
      .modify((queryBuilder) => applyTitleJoins(queryBuilder))
      .whereNotNull("file_items.deleted_at")
      .select(
        db.raw("'file' as type"),
        "file_items.id as id",
        "file_items.id as file_id",
        db.raw("null::int as version_id"),
        db.raw("null::int as version_number"),
        db.raw("null::text as asset_lang"),
        db.raw("null::text as asset_name"),
        db.raw("coalesce(??, ??) as title", ["ft_pref.title", "ft_def.title"]),
        "file_items.deleted_at as deleted_at"
      );

    if (q) {
      filesQuery.whereRaw("coalesce(??, ??) ILIKE ?", ["ft_pref.title", "ft_def.title", `%${q}%`]);
    }

    const versionsQuery = db("file_versions")
      .leftJoin("file_items", "file_versions.file_item_id", "file_items.id")
      .modify((queryBuilder) => applyTitleJoins(queryBuilder))
      .whereNotNull("file_versions.deleted_at")
      .select(
        db.raw("'version' as type"),
        "file_versions.id as id",
        "file_items.id as file_id",
        "file_versions.id as version_id",
        "file_versions.version_number as version_number",
        db.raw("null::text as asset_lang"),
        db.raw("null::text as asset_name"),
        db.raw("coalesce(??, ??) as title", ["ft_pref.title", "ft_def.title"]),
        "file_versions.deleted_at as deleted_at"
      );

    if (q) {
      versionsQuery.whereRaw("coalesce(??, ??) ILIKE ?", ["ft_pref.title", "ft_def.title", `%${q}%`]);
    }

    const assetsQuery = db("file_version_assets")
      .leftJoin("file_versions", "file_version_assets.file_version_id", "file_versions.id")
      .leftJoin("file_items", "file_versions.file_item_id", "file_items.id")
      .modify((queryBuilder) => applyTitleJoins(queryBuilder))
      .whereNotNull("file_version_assets.deleted_at")
      .whereNull("file_versions.deleted_at")
      .select(
        db.raw("'asset' as type"),
        "file_version_assets.id as id",
        "file_items.id as file_id",
        "file_versions.id as version_id",
        "file_versions.version_number as version_number",
        "file_version_assets.lang as asset_lang",
        "file_version_assets.original_name as asset_name",
        db.raw("coalesce(??, ??) as title", ["ft_pref.title", "ft_def.title"]),
        "file_version_assets.deleted_at as deleted_at"
      );

    if (q) {
      assetsQuery.where((builder: any) => {
        builder.whereRaw("coalesce(??, ??) ILIKE ?", ["ft_pref.title", "ft_def.title", `%${q}%`]);
        builder.orWhereRaw("file_version_assets.original_name ILIKE ?", [`%${q}%`]);
      });
    }

    const unionQuery = db.unionAll([filesQuery, versionsQuery, assetsQuery], true);
    const countResult = await db
      .from(unionQuery.as("trash"))
      .count<{ count: string }>("* as count")
      .first();
    const rows = await db
      .from(unionQuery.as("trash"))
      .orderBy("deleted_at", "desc")
      .offset((page - 1) * pageSize)
      .limit(pageSize);

    const data = rows.map((row: any) => ({
      id: row.id,
      type: row.type,
      title: row.title || null,
      deletedAt: row.deleted_at,
      fileId: row.file_id || null,
      versionId: row.version_id || null,
      versionNumber: row.version_number || null,
      assetLang: row.asset_lang || null,
      assetName: row.asset_name || null
    }));

    return { data, meta: buildPaginationMeta(page, pageSize, Number(countResult?.count || 0)) };
  }

  async listUserOwnFiles(
    params: { page: number; pageSize: number; q?: string; sortBy?: string; sortDir?: string },
    user: any,
    preferredLang: string | null
  ) {
    const result = await this.listManage(
      {
        page: params.page,
        pageSize: params.pageSize,
        q: params.q,
        sortBy: params.sortBy,
        sortDir: params.sortDir,
        createdBy: user.id
      },
      preferredLang
    );
    const fileIds = (result.data || []).map((item: any) => item.id);
    const departmentIds = await this.getDepartmentScopeIds(user.departmentId);
    const accessUserIds = fileIds.length
      ? await this.dbService.db("file_access_users")
          .whereIn("file_item_id", fileIds)
          .where("user_id", user.id)
          .pluck("file_item_id")
      : [];
    const accessDepartmentIds =
      fileIds.length && departmentIds.length
        ? await this.dbService.db("file_access_departments")
            .whereIn("file_item_id", fileIds)
            .whereIn("department_id", departmentIds)
            .pluck("file_item_id")
        : [];
    const accessUserSet = new Set<number>(accessUserIds.map((id: number) => Number(id)));
    const accessDepartmentSet = new Set<number>(accessDepartmentIds.map((id: number) => Number(id)));
    const canDownloadRestricted = Boolean(user?.permissions?.includes("file.download.restricted"));
    const favoriteIds = fileIds.length
      ? await this.dbService.db("file_favorites").whereIn("file_item_id", fileIds).where("user_id", user.id).pluck("file_item_id")
      : [];
    const favoriteSet = new Set(favoriteIds.map((id: any) => String(id)));

    const data = (result.data || []).map((item: any) => ({
      ...item,
      canDownload:
        item.accessType === "public" ||
        canDownloadRestricted ||
        accessUserSet.has(item.id) ||
        accessDepartmentSet.has(item.id),
      isFavorite: favoriteSet.has(String(item.id))
    }));

    return { data, meta: result.meta };
  }

  async listUserFavorites(
    params: { page: number; pageSize: number; q?: string; sortBy?: string; sortDir?: string },
    user: any,
    preferredLang: string | null
  ) {
    const { page, pageSize, q, sortBy, sortDir } = params;
    const db = this.dbService.db;
    const defaultLang = this.getDefaultLang();
    const lang = normalizeLang(preferredLang) || null;
    const sortLang = lang || defaultLang;
    const departmentIds = await this.getDepartmentScopeIds(user.departmentId);
    const query = db("file_items")
      .innerJoin("file_favorites", function () {
        this.on("file_items.id", "file_favorites.file_item_id").andOn("file_favorites.user_id", db.raw("?", [user.id]));
      })
      .leftJoin("file_translations", "file_items.id", "file_translations.file_item_id")
      .select(
        "file_items.id",
        "file_items.section_id",
        "file_items.category_id",
        "file_items.access_type",
        "file_items.current_version_id",
        "file_items.created_at",
        "file_items.updated_at",
        "file_translations.lang",
        "file_translations.title",
        "file_translations.description"
      )
      .whereNull("file_items.deleted_at");

    if (q) {
      query.whereILike("file_translations.title", `%${q}%`);
    }

    const direction = sortDir === "asc" ? "asc" : "desc";
    if (sortBy === "title") {
      query.leftJoin({ sort_title_pref: "file_translations" }, function () {
        this.on("file_items.id", "sort_title_pref.file_item_id").andOn("sort_title_pref.lang", db.raw("?", [sortLang]));
      });
      if (sortLang !== defaultLang) {
        query.leftJoin({ sort_title_def: "file_translations" }, function () {
          this.on("file_items.id", "sort_title_def.file_item_id").andOn("sort_title_def.lang", db.raw("?", [defaultLang]));
        });
      }
      if (sortLang !== defaultLang) {
        query.orderByRaw(`coalesce(??, ??) ${direction}`, ["sort_title_pref.title", "sort_title_def.title"]);
      } else {
        query.orderByRaw(`?? ${direction}`, ["sort_title_pref.title"]);
      }
    } else if (sortBy === "category") {
      query.leftJoin("categories", "file_items.category_id", "categories.id");
      query.leftJoin({ sort_cat_pref: "categories_translations" }, function () {
        this.on("categories.id", "sort_cat_pref.category_id").andOn("sort_cat_pref.lang", db.raw("?", [sortLang]));
      });
      if (sortLang !== defaultLang) {
        query.leftJoin({ sort_cat_def: "categories_translations" }, function () {
          this.on("categories.id", "sort_cat_def.category_id").andOn("sort_cat_def.lang", db.raw("?", [defaultLang]));
        });
      }
      if (sortLang !== defaultLang) {
        query.orderByRaw(`coalesce(??, ??) ${direction}`, ["sort_cat_pref.title", "sort_cat_def.title"]);
      } else {
        query.orderByRaw(`?? ${direction}`, ["sort_cat_pref.title"]);
      }
    } else if (sortBy === "size") {
      const sizeTotals = db("file_version_assets")
        .select("file_version_id")
        .sum<{ size: string }>("size as size")
        .groupBy("file_version_id")
        .as("size_totals");
      query.leftJoin(sizeTotals, "size_totals.file_version_id", "file_items.current_version_id");
      query.leftJoin({ size_pref: "file_version_assets" }, function () {
        this.on("size_pref.file_version_id", "file_items.current_version_id").andOn("size_pref.lang", db.raw("?", [sortLang]));
      });
      query.orderByRaw(`coalesce(??, ??, 0) ${direction}`, ["size_pref.size", "size_totals.size"]);
    } else if (sortBy === "updated_at") {
      query.orderBy("file_items.updated_at", direction);
    } else if (sortBy === "popular") {
      query.orderBy("file_items.created_at", "desc");
    } else {
      query.orderBy("file_items.created_at", direction);
    }

    const countResult = await query
      .clone()
      .clearSelect()
      .clearOrder()
      .countDistinct<{ count: string }>("file_items.id as count")
      .first();
    const rows = await query.offset((page - 1) * pageSize).limit(pageSize);

    type UserFileRow = {
      id: number;
      section_id: number;
      category_id: number;
      access_type: string;
      current_version_id: number | null;
      created_at: string;
      updated_at: string;
      translations: FileTranslation[];
    };
    const grouped = new Map<number, UserFileRow>();
    rows.forEach((row: any) => {
      if (!grouped.has(row.id)) {
        grouped.set(row.id, {
          id: row.id,
          section_id: row.section_id,
          category_id: row.category_id,
          access_type: row.access_type,
          current_version_id: row.current_version_id,
          created_at: row.created_at,
          updated_at: row.updated_at,
          translations: []
        });
      }
      const current = grouped.get(row.id);
      if (row.lang && current) {
        current.translations.push({
          lang: row.lang,
          title: row.title,
          description: row.description
        });
      }
    });

    const baseData = Array.from(grouped.values()).map((item) => {
      const picked = selectTranslation<FileTranslation>(item.translations, lang, defaultLang);
      return {
        id: item.id,
        sectionId: item.section_id,
        categoryId: item.category_id,
        accessType: item.access_type,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        title: picked?.title || null,
        description: picked?.description || null,
        availableLangs: getAvailableLangs(item.translations),
        currentVersionId: item.current_version_id,
        isFavorite: true
      };
    });

    const versionIds = baseData.map((item) => item.currentVersionId).filter(Boolean) as number[];
    const assetLangsByVersion = new Map<number, Set<string>>();
    const assetSizesByVersion = new Map<number, number>();
    const assetSizesByLang = new Map<number, Map<string, number>>();
    if (versionIds.length > 0) {
      const assetRows = await this.dbService.db("file_version_assets")
        .select("file_version_id", "lang", "size")
        .whereIn("file_version_id", versionIds)
        .whereNull("deleted_at");
      assetRows.forEach((row: any) => {
        if (!assetLangsByVersion.has(row.file_version_id)) {
          assetLangsByVersion.set(row.file_version_id, new Set<string>());
        }
        assetLangsByVersion.get(row.file_version_id)?.add(row.lang);
        if (!assetSizesByLang.has(row.file_version_id)) {
          assetSizesByLang.set(row.file_version_id, new Map<string, number>());
        }
        assetSizesByLang.get(row.file_version_id)?.set(row.lang, Number(row.size || 0));
      });

      const sizeRows = (await this.dbService.db("file_version_assets")
        .select("file_version_id")
        .sum<{ size: string }>("size as size")
        .whereIn("file_version_id", versionIds)
        .whereNull("deleted_at")
        .groupBy("file_version_id")) as any[];
      sizeRows.forEach((row: any) => {
        assetSizesByVersion.set(row.file_version_id, Number(row.size || 0));
      });
    }

    const fileIds = baseData.map((item) => item.id);
    const accessUserIds = fileIds.length
      ? await db("file_access_users").whereIn("file_item_id", fileIds).where("user_id", user.id).pluck("file_item_id")
      : [];
    const accessDepartmentIds =
      fileIds.length && departmentIds.length
        ? await db("file_access_departments")
            .whereIn("file_item_id", fileIds)
            .whereIn("department_id", departmentIds)
            .pluck("file_item_id")
        : [];
    const accessUserSet = new Set<number>(accessUserIds.map((id: number) => Number(id)));
    const accessDepartmentSet = new Set<number>(accessDepartmentIds.map((id: number) => Number(id)));
    const canDownloadRestricted = Boolean(user?.permissions?.includes("file.download.restricted"));
    const favoriteIds = fileIds.length
      ? await db("file_favorites").whereIn("file_item_id", fileIds).where("user_id", user.id).pluck("file_item_id")
      : [];
    const favoriteSet = new Set(favoriteIds.map((id: any) => String(id)));

    const data = baseData.map((item) => {
      const langs = item.currentVersionId ? Array.from(assetLangsByVersion.get(item.currentVersionId) || []) : [];
      const sizes =
        item.currentVersionId && assetSizesByLang.has(item.currentVersionId)
          ? Array.from(assetSizesByLang.get(item.currentVersionId) || new Map()).map(([lang, size]) => ({
              lang,
              size
            }))
          : [];
      const canDownload =
        item.accessType === "public" ||
        canDownloadRestricted ||
        accessUserSet.has(item.id) ||
        accessDepartmentSet.has(item.id);
      return {
        ...item,
        canDownload,
        isFavorite: favoriteSet.has(String(item.id)),
        availableAssetLangs: langs.sort(),
        availableAssetSizes: sizes.sort((a, b) => a.lang.localeCompare(b.lang)),
        currentAssetSize: item.currentVersionId ? assetSizesByVersion.get(item.currentVersionId) || 0 : 0
      };
    });

    return { data, meta: buildPaginationMeta(page, pageSize, Number(countResult?.count || 0)) };
  }

  async addFavorite(fileItemId: number, user: any) {
    const file = await this.dbService.db("file_items")
      .where({ id: fileItemId })
      .whereNull("deleted_at")
      .first();
    if (!file) throw new NotFoundException();

    await this.dbService.db("file_favorites")
      .insert({
        file_item_id: fileItemId,
        user_id: user.id,
        created_at: this.dbService.db.fn.now()
      })
      .onConflict(["file_item_id", "user_id"])
      .ignore();

    return { success: true };
  }

  async removeFavorite(fileItemId: number, user: any) {
    await this.dbService.db("file_favorites")
      .where({ file_item_id: fileItemId, user_id: user.id })
      .delete();
    return { success: true };
  }

  async forceDelete(fileItemId: number, actorId?: number) {
    const versions = await this.dbService.db("file_versions")
      .where({ file_item_id: fileItemId })
      .select("id");
    const versionIds = versions.map((v: any) => v.id);

    const assets = versionIds.length
      ? await this.dbService.db("file_version_assets")
          .whereIn("file_version_id", versionIds)
          .select("path")
      : [];

    for (const asset of assets) {
      if (asset.path) {
        await this.deleteFileSafe(asset.path);
      }
    }

    await this.dbService.db.transaction(async (trx) => {
      if (versionIds.length) {
        await trx("file_version_assets").whereIn("file_version_id", versionIds).delete();
      }
      await trx("file_versions").where({ file_item_id: fileItemId }).delete();
      await trx("file_translations").where({ file_item_id: fileItemId }).delete();
      await trx("file_access_departments").where({ file_item_id: fileItemId }).delete();
      await trx("file_access_users").where({ file_item_id: fileItemId }).delete();
      await trx("file_items").where({ id: fileItemId }).delete();
    });

    if (actorId) {
      await this.auditService.log({
        actorUserId: actorId,
        action: "FILE_FORCE_DELETED",
        entityType: "FILE",
        entityId: fileItemId
      });
    }

    return { success: true };
  }

  async listVersions(fileItemId: number) {
    const versions = await this.dbService.db("file_versions")
      .where({ file_item_id: fileItemId })
      .orderBy("version_number", "desc");

    const versionIds = versions.map((version: any) => version.id);
    const assets = versionIds.length
      ? await this.dbService.db("file_version_assets")
          .whereIn("file_version_id", versionIds)
          .whereNull("deleted_at")
          .select(
            "id",
            "file_version_id",
            "lang",
            "original_name",
            "mime",
            "size",
            "path",
            "created_at"
          )
      : [];

    const assetsByVersion = new Map<number, any[]>();
    assets.forEach((asset: any) => {
      if (!assetsByVersion.has(asset.file_version_id)) {
        assetsByVersion.set(asset.file_version_id, []);
      }
      assetsByVersion.get(asset.file_version_id)?.push({
        id: asset.id,
        lang: asset.lang,
        originalName: asset.original_name,
        mime: asset.mime,
        size: asset.size,
        path: asset.path,
        createdAt: asset.created_at
      });
    });

    const data = versions.map((version: any) => ({
      ...version,
      assets: assetsByVersion.get(version.id) || []
    }));

    return { data };
  }

  async createVersion(fileItemId: number, dto: any, actorId: number) {
    return this.dbService.db.transaction(async (trx) => {
      const file = await trx("file_items").where({ id: fileItemId }).first();
      if (!file) throw new NotFoundException();

      const max = await trx("file_versions")
        .where({ file_item_id: fileItemId })
        .max<{ max: number }>("version_number as max")
        .first();
      const nextNumber = (max?.max || 0) + 1;

      const [version] = await trx("file_versions")
        .insert({
          file_item_id: fileItemId,
          version_number: nextNumber,
          comment: dto.comment || null,
          created_by: actorId,
          created_at: trx.fn.now(),
          updated_at: trx.fn.now()
        })
        .returning("id");

      const versionId = version.id || version;

      if (dto.copyFromCurrent && file.current_version_id) {
        const assets = await trx("file_version_assets")
          .where({ file_version_id: file.current_version_id })
          .select("lang", "path", "original_name", "mime", "size", "checksum");

        for (const asset of assets) {
          const newPath = await this.buildAssetPath(asset.original_name);
          await this.ensureUploadDir(path.dirname(newPath));
          await fs.copyFile(asset.path, newPath);

          await trx("file_version_assets").insert({
            file_version_id: versionId,
            lang: asset.lang,
            original_name: asset.original_name,
            mime: asset.mime,
            size: asset.size,
            path: newPath,
            checksum: asset.checksum || null,
            created_at: trx.fn.now(),
            updated_at: trx.fn.now()
          });
        }
      }

      await this.auditService.log({
        actorUserId: actorId,
        action: "FILE_VERSION_CREATED",
        entityType: "FILE_VERSION",
        entityId: versionId,
        meta: { versionNumber: nextNumber }
      });

      return { id: versionId, versionNumber: nextNumber };
    });
  }

  async setCurrentVersion(fileItemId: number, versionId: number, actorId: number) {
    const version = await this.dbService.db("file_versions")
      .where({ id: versionId, file_item_id: fileItemId })
      .whereNull("deleted_at")
      .first();
    if (!version) throw new NotFoundException();

    await this.dbService.db("file_items").update({ current_version_id: versionId }).where({ id: fileItemId });

    await this.auditService.log({
      actorUserId: actorId,
      action: "FILE_VERSION_SET_CURRENT",
      entityType: "FILE_VERSION",
      entityId: versionId
    });

    return { success: true };
  }

  async deleteVersion(fileItemId: number, versionId: number, actorId: number) {
    const file = await this.dbService.db("file_items").where({ id: fileItemId }).first();
    if (!file) throw new NotFoundException();
    if (file.current_version_id === versionId) {
      throw new BadRequestException("Cannot delete current version");
    }

    const activeCount = await this.dbService.db("file_versions")
      .where({ file_item_id: fileItemId })
      .whereNull("deleted_at")
      .count<{ count: string }>("id as count")
      .first();
    if (Number(activeCount?.count || 0) <= 1) {
      throw new BadRequestException("Cannot delete last version");
    }

    const now = this.dbService.db.fn.now();
    await this.dbService.db("file_versions").where({ id: versionId }).update({ deleted_at: now });
    await this.dbService.db("file_version_assets")
      .where({ file_version_id: versionId })
      .whereNull("deleted_at")
      .update({ deleted_at: now, updated_at: now });

    await this.auditService.log({
      actorUserId: actorId,
      action: "FILE_VERSION_DELETED",
      entityType: "FILE_VERSION",
      entityId: versionId
    });

    return { success: true };
  }

  async restoreVersion(fileItemId: number, versionId: number, actorId: number) {
    const version = await this.dbService.db("file_versions")
      .where({ id: versionId, file_item_id: fileItemId })
      .first();
    if (!version) throw new NotFoundException();

    const now = this.dbService.db.fn.now();
    await this.dbService.db("file_versions").update({ deleted_at: null }).where({ id: versionId });
    await this.dbService.db("file_version_assets")
      .where({ file_version_id: versionId })
      .update({ deleted_at: null, updated_at: now });

    await this.auditService.log({
      actorUserId: actorId,
      action: "FILE_VERSION_RESTORED",
      entityType: "FILE_VERSION",
      entityId: versionId
    });

    return { success: true };
  }

  async restoreVersionById(versionId: number, actorId: number) {
    const version = await this.dbService.db("file_versions").where({ id: versionId }).first();
    if (!version) throw new NotFoundException();

    const now = this.dbService.db.fn.now();
    await this.dbService.db("file_versions").update({ deleted_at: null }).where({ id: versionId });
    await this.dbService.db("file_version_assets")
      .where({ file_version_id: versionId })
      .update({ deleted_at: null, updated_at: now });

    await this.auditService.log({
      actorUserId: actorId,
      action: "FILE_VERSION_RESTORED",
      entityType: "FILE_VERSION",
      entityId: versionId
    });

    return { success: true };
  }

  async forceDeleteVersion(versionId: number, actorId: number) {
    const version = await this.dbService.db("file_versions").where({ id: versionId }).first();
    if (!version) throw new NotFoundException();

    const file = await this.dbService.db("file_items").where({ id: version.file_item_id }).first();
    if (file?.current_version_id === versionId) {
      throw new BadRequestException("Cannot delete current version");
    }

    const assets = await this.dbService.db("file_version_assets")
      .where({ file_version_id: versionId })
      .select("path");
    for (const asset of assets) {
      if (asset.path) {
        await this.deleteFileSafe(asset.path);
      }
    }

    await this.dbService.db.transaction(async (trx) => {
      await trx("file_version_assets").where({ file_version_id: versionId }).delete();
      await trx("file_versions").where({ id: versionId }).delete();
    });

    await this.auditService.log({
      actorUserId: actorId,
      action: "FILE_VERSION_FORCE_DELETED",
      entityType: "FILE_VERSION",
      entityId: versionId
    });

    return { success: true };
  }

  async uploadAsset(fileItemId: number, versionId: number, lang: string, file: Express.Multer.File, actorId: number) {
    if (!file) throw new BadRequestException("File is required");
    const version = await this.dbService.db("file_versions")
      .where({ id: versionId, file_item_id: fileItemId })
      .whereNull("deleted_at")
      .first();
    if (!version) throw new NotFoundException();

    const maxSizeMb = Number(this.config.get<string>("MAX_UPLOAD_SIZE_MB", "10"));
    if (file.size > maxSizeMb * 1024 * 1024) {
      await this.deleteFileSafe(file.path);
      throw new BadRequestException("File too large");
    }

    const allowed = (this.config.get<string>("ALLOWED_EXTENSIONS", "pdf,txt,docx") || "")
      .split(",")
      .map((x) => x.trim().toLowerCase())
      .filter(Boolean);
    const ext = path.extname(file.originalname).replace(".", "").toLowerCase();
    if (allowed.length && !allowed.includes(ext)) {
      await this.deleteFileSafe(file.path);
      throw new BadRequestException("File extension not allowed");
    }
    const allowedMimes = (this.config.get<string>("ALLOWED_MIME_TYPES", "") || "")
      .split(",")
      .map((x) => x.trim().toLowerCase())
      .filter(Boolean);
    const mime = (file.mimetype || "").toLowerCase();
    if (allowedMimes.length && !allowedMimes.includes(mime)) {
      await this.deleteFileSafe(file.path);
      throw new BadRequestException("File type not allowed");
    }

    const newPath = await this.buildAssetPath(file.originalname);
    await this.ensureUploadDir(path.dirname(newPath));
    await fs.rename(file.path, newPath);

    const now = this.dbService.db.fn.now();
    const existing = await this.dbService.db("file_version_assets")
      .where({ file_version_id: versionId, lang })
      .first();
    if (existing) {
      await this.deleteFileSafe(existing.path);
      await this.dbService.db("file_version_assets")
        .where({ id: existing.id })
        .update({
          original_name: file.originalname,
          mime: file.mimetype,
          size: file.size,
          path: newPath,
          checksum: null,
          deleted_at: null,
          updated_at: now
        });
      await this.auditService.log({
        actorUserId: actorId,
        action: "FILE_ASSET_UPLOADED",
        entityType: "FILE_VERSION",
        entityId: versionId,
        meta: { lang, size: file.size, originalName: file.originalname }
      });
      return { id: existing.id };
    }

    const [asset] = await this.dbService.db("file_version_assets")
      .insert({
        file_version_id: versionId,
        lang,
        original_name: file.originalname,
        mime: file.mimetype,
        size: file.size,
        path: newPath,
        created_at: now,
        updated_at: now
      })
      .returning("id");

    await this.auditService.log({
      actorUserId: actorId,
      action: "FILE_ASSET_UPLOADED",
      entityType: "FILE_VERSION",
      entityId: versionId,
      meta: { lang, size: file.size, originalName: file.originalname }
    });

    return { id: asset.id || asset };
  }

  async deleteAsset(fileItemId: number, versionId: number, assetId: number, actorId: number) {
    const asset = await this.dbService.db("file_version_assets")
      .where({ id: assetId, file_version_id: versionId })
      .first();
    if (!asset) throw new NotFoundException();

    if (!asset.deleted_at) {
      await this.dbService.db("file_version_assets")
        .where({ id: assetId })
        .update({ deleted_at: this.dbService.db.fn.now(), updated_at: this.dbService.db.fn.now() });
    }

    await this.auditService.log({
      actorUserId: actorId,
      action: "FILE_ASSET_DELETED",
      entityType: "FILE_VERSION",
      entityId: versionId,
      meta: { lang: asset.lang }
    });

    return { success: true };
  }

  async restoreAsset(assetId: number, actorId: number) {
    const asset = await this.dbService.db("file_version_assets").where({ id: assetId }).first();
    if (!asset) throw new NotFoundException();

    await this.dbService.db("file_version_assets")
      .where({ id: assetId })
      .update({ deleted_at: null, updated_at: this.dbService.db.fn.now() });

    await this.auditService.log({
      actorUserId: actorId,
      action: "FILE_ASSET_RESTORED",
      entityType: "FILE_VERSION_ASSET",
      entityId: assetId
    });

    return { success: true };
  }

  async forceDeleteAsset(assetId: number, actorId: number) {
    const asset = await this.dbService.db("file_version_assets").where({ id: assetId }).first();
    if (!asset) throw new NotFoundException();

    await this.deleteFileSafe(asset.path);
    await this.dbService.db("file_version_assets").where({ id: assetId }).delete();

    await this.auditService.log({
      actorUserId: actorId,
      action: "FILE_ASSET_FORCE_DELETED",
      entityType: "FILE_VERSION_ASSET",
      entityId: assetId
    });

    return { success: true };
  }

  async listUserFiles(params: { page: number; pageSize: number; q?: string; sortBy?: string; sortDir?: string; sectionId?: number; categoryId?: number }, user: any, preferredLang: string | null) {
    const { page, pageSize, q, sortBy, sortDir, sectionId, categoryId } = params;
    const db = this.dbService.db;
    const defaultLang = this.getDefaultLang();
    const lang = normalizeLang(preferredLang) || null;
    const sortLang = lang || defaultLang;
    const departmentIds = await this.getDepartmentScopeIds(user.departmentId);
    const query = db("file_items")
      .leftJoin("file_translations", "file_items.id", "file_translations.file_item_id")
      .select(
        "file_items.id",
        "file_items.section_id",
        "file_items.category_id",
        "file_items.access_type",
        "file_items.current_version_id",
        "file_items.created_at",
        "file_items.updated_at",
        "file_translations.lang",
        "file_translations.title",
        "file_translations.description"
      )
      .whereNull("file_items.deleted_at");

    if (sectionId) {
      query.where("file_items.section_id", sectionId);
    }

    if (categoryId) {
      const categoryIds = await this.getCategoryScopeIds(categoryId);
      if (categoryIds.length) {
        query.whereIn("file_items.category_id", categoryIds);
      } else {
        query.where("file_items.category_id", categoryId);
      }
    }

    if (q) {
      query.whereILike("file_translations.title", `%${q}%`);
    }

    const direction = sortDir === "asc" ? "asc" : "desc";
    if (sortBy === "title") {
      query.leftJoin({ sort_title_pref: "file_translations" }, function () {
        this.on("file_items.id", "sort_title_pref.file_item_id").andOn("sort_title_pref.lang", db.raw("?", [sortLang]));
      });
      if (sortLang !== defaultLang) {
        query.leftJoin({ sort_title_def: "file_translations" }, function () {
          this.on("file_items.id", "sort_title_def.file_item_id").andOn("sort_title_def.lang", db.raw("?", [defaultLang]));
        });
      }
      if (sortLang !== defaultLang) {
        query.orderByRaw(`coalesce(??, ??) ${direction}`, ["sort_title_pref.title", "sort_title_def.title"]);
      } else {
        query.orderByRaw(`?? ${direction}`, ["sort_title_pref.title"]);
      }
    } else if (sortBy === "category") {
      query.leftJoin("categories", "file_items.category_id", "categories.id");
      query.leftJoin({ sort_cat_pref: "categories_translations" }, function () {
        this.on("categories.id", "sort_cat_pref.category_id").andOn("sort_cat_pref.lang", db.raw("?", [sortLang]));
      });
      if (sortLang !== defaultLang) {
        query.leftJoin({ sort_cat_def: "categories_translations" }, function () {
          this.on("categories.id", "sort_cat_def.category_id").andOn("sort_cat_def.lang", db.raw("?", [defaultLang]));
        });
      }
      if (sortLang !== defaultLang) {
        query.orderByRaw(`coalesce(??, ??) ${direction}`, ["sort_cat_pref.title", "sort_cat_def.title"]);
      } else {
        query.orderByRaw(`?? ${direction}`, ["sort_cat_pref.title"]);
      }
    } else if (sortBy === "size") {
      const sizeTotals = db("file_version_assets")
        .select("file_version_id")
        .sum<{ size: string }>("size as size")
        .groupBy("file_version_id")
        .as("size_totals");
      query.leftJoin(sizeTotals, "size_totals.file_version_id", "file_items.current_version_id");
      query.leftJoin({ size_pref: "file_version_assets" }, function () {
        this.on("size_pref.file_version_id", "file_items.current_version_id").andOn("size_pref.lang", db.raw("?", [sortLang]));
      });
      query.orderByRaw(`coalesce(??, ??, 0) ${direction}`, ["size_pref.size", "size_totals.size"]);
    } else if (sortBy === "updated_at") {
      query.orderBy("file_items.updated_at", direction);
    } else if (sortBy === "popular") {
      query.orderBy("file_items.created_at", "desc");
    } else {
      query.orderBy("file_items.created_at", direction);
    }

    const countResult = await query
      .clone()
      .clearSelect()
      .clearOrder()
      .countDistinct<{ count: string }>("file_items.id as count")
      .first();
    const rows = await query.offset((page - 1) * pageSize).limit(pageSize);

    type UserFileRow = {
      id: number;
      section_id: number;
      category_id: number;
      access_type: string;
      current_version_id: number | null;
      created_at: string;
      updated_at: string;
      translations: FileTranslation[];
    };
    const grouped = new Map<number, UserFileRow>();
    rows.forEach((row: any) => {
      if (!grouped.has(row.id)) {
        grouped.set(row.id, {
          id: row.id,
          section_id: row.section_id,
          category_id: row.category_id,
          access_type: row.access_type,
          current_version_id: row.current_version_id,
          created_at: row.created_at,
          updated_at: row.updated_at,
          translations: []
        });
      }
      const current = grouped.get(row.id);
      if (row.lang && current) {
        current.translations.push({
          lang: row.lang,
          title: row.title,
          description: row.description
        });
      }
    });

    const baseData = Array.from(grouped.values()).map((item) => {
      const picked = selectTranslation<FileTranslation>(item.translations, lang, defaultLang);
      return {
        id: item.id,
        sectionId: item.section_id,
        categoryId: item.category_id,
        accessType: item.access_type,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        title: picked?.title || null,
        description: picked?.description || null,
        availableLangs: getAvailableLangs(item.translations),
        currentVersionId: item.current_version_id
      };
    });

    const versionIds = baseData.map((item) => item.currentVersionId).filter(Boolean) as number[];
    const assetLangsByVersion = new Map<number, Set<string>>();
    const assetSizesByVersion = new Map<number, number>();
    const assetSizesByLang = new Map<number, Map<string, number>>();
    if (versionIds.length > 0) {
      const assetRows = await this.dbService.db("file_version_assets")
        .select("file_version_id", "lang", "size")
        .whereIn("file_version_id", versionIds)
        .whereNull("deleted_at");
      assetRows.forEach((row: any) => {
        if (!assetLangsByVersion.has(row.file_version_id)) {
          assetLangsByVersion.set(row.file_version_id, new Set<string>());
        }
        assetLangsByVersion.get(row.file_version_id)?.add(row.lang);
        if (!assetSizesByLang.has(row.file_version_id)) {
          assetSizesByLang.set(row.file_version_id, new Map<string, number>());
        }
        assetSizesByLang.get(row.file_version_id)?.set(row.lang, Number(row.size || 0));
      });

      const sizeRows = (await this.dbService.db("file_version_assets")
        .select("file_version_id")
        .sum<{ size: string }>("size as size")
        .whereIn("file_version_id", versionIds)
        .whereNull("deleted_at")
        .groupBy("file_version_id")) as any[];
      sizeRows.forEach((row: any) => {
        assetSizesByVersion.set(row.file_version_id, Number(row.size || 0));
      });
    }

    const fileIds = baseData.map((item) => item.id);
    const accessUserIds = fileIds.length
      ? await db("file_access_users").whereIn("file_item_id", fileIds).where("user_id", user.id).pluck("file_item_id")
      : [];
    const accessDepartmentIds =
      fileIds.length && departmentIds.length
        ? await db("file_access_departments")
            .whereIn("file_item_id", fileIds)
            .whereIn("department_id", departmentIds)
            .pluck("file_item_id")
        : [];
    const accessUserSet = new Set<number>(accessUserIds.map((id: number) => Number(id)));
    const accessDepartmentSet = new Set<number>(accessDepartmentIds.map((id: number) => Number(id)));
    const canDownloadRestricted = Boolean(user?.permissions?.includes("file.download.restricted"));

    const data = baseData.map((item) => {
      const langs = item.currentVersionId ? Array.from(assetLangsByVersion.get(item.currentVersionId) || []) : [];
      const sizes =
        item.currentVersionId && assetSizesByLang.has(item.currentVersionId)
          ? Array.from(assetSizesByLang.get(item.currentVersionId) || new Map()).map(([lang, size]) => ({
              lang,
              size
            }))
          : [];
      const canDownload =
        item.accessType === "public" ||
        canDownloadRestricted ||
        accessUserSet.has(item.id) ||
        accessDepartmentSet.has(item.id);
      return {
        ...item,
        canDownload,
        availableAssetLangs: langs.sort(),
        availableAssetSizes: sizes.sort((a, b) => a.lang.localeCompare(b.lang)),
        currentAssetSize: item.currentVersionId ? assetSizesByVersion.get(item.currentVersionId) || 0 : 0
      };
    });

    return { data, meta: buildPaginationMeta(page, pageSize, Number(countResult?.count || 0)) };
  }

  async getUserFile(fileItemId: number, user: any, preferredLang: string | null) {
    await this.validateAccess(user, fileItemId);

    const rows = await this.dbService.db("file_items")
      .leftJoin("file_translations", "file_items.id", "file_translations.file_item_id")
      .leftJoin("file_versions", "file_items.current_version_id", "file_versions.id")
      .select(
        "file_items.id",
        "file_items.section_id",
        "file_items.category_id",
        "file_items.access_type",
        "file_items.current_version_id",
        "file_versions.version_number",
        "file_translations.lang",
        "file_translations.title",
        "file_translations.description"
      )
      .where("file_items.id", fileItemId);

    if (!rows.length) throw new NotFoundException();

    const translations: FileTranslation[] = rows
      .filter((r) => r.lang)
      .map((r) => ({ lang: r.lang as Lang, title: r.title, description: r.description }));
    const defaultLang = this.getDefaultLang();
    const lang = normalizeLang(preferredLang) || null;
    const picked = selectTranslation<FileTranslation>(translations, lang, defaultLang);

    const assets = await this.dbService.db("file_version_assets")
      .where({ file_version_id: rows[0].current_version_id })
      .whereNull("deleted_at")
      .select("id", "lang", "original_name", "size", "mime");

    const availableAssetLangs = assets.map((asset: any) => asset.lang).filter(Boolean);

    const accessDepartments = await this.dbService.db("file_access_departments")
      .leftJoin("departments", "departments.id", "file_access_departments.department_id")
      .select("departments.id", "departments.name")
      .where("file_access_departments.file_item_id", fileItemId)
      .orderBy("departments.name", "asc");
    const departmentPaths = await this.getDepartmentPaths(accessDepartments.map((dept: any) => dept.id));
    const accessDepartmentsWithPaths = accessDepartments.map((dept: any) => ({
      ...dept,
      path: departmentPaths.get(dept.id) || dept.name
    }));
    const accessUsersRows = await this.dbService.db("file_access_users")
      .leftJoin("users", "users.id", "file_access_users.user_id")
      .select("users.id", "users.login", "users.surname", "users.name", "users.patronymic")
      .where("file_access_users.file_item_id", fileItemId)
      .orderBy("users.login", "asc");
    const accessUsers = accessUsersRows.map((row: any) => {
      const fullName = [row.surname, row.name, row.patronymic].filter(Boolean).join(" ").trim();
      return {
        id: row.id,
        login: row.login,
        fullName: fullName || null
      };
    });

    return {
      id: fileItemId,
      sectionId: rows[0].section_id,
      categoryId: rows[0].category_id,
      accessType: rows[0].access_type,
      currentVersionId: rows[0].current_version_id,
      currentVersionNumber: rows[0].version_number || null,
      title: picked?.title || null,
      description: picked?.description || null,
      availableLangs: getAvailableLangs(translations),
      availableAssetLangs,
      assets,
      translations,
      accessDepartments: accessDepartmentsWithPaths,
      accessUsers
    };
  }

  async download(fileItemId: number, user: any, preferredLang: string | null) {
    await this.validateAccess(user, fileItemId);

    const file = await this.dbService.db("file_items").where({ id: fileItemId }).first();
    if (!file || !file.current_version_id) throw new NotFoundException();

    const assets = await this.dbService.db("file_version_assets")
      .where({ file_version_id: file.current_version_id })
      .whereNull("deleted_at")
      .select("id", "lang", "path", "original_name", "mime");
    if (!assets.length) throw new NotFoundException("No assets");

    const defaultLang = this.getDefaultLang();
    const lang = normalizeLang(preferredLang) || null;
    const selected = assets.find((a) => a.lang === (lang || defaultLang)) || assets.find((a) => a.lang === defaultLang) || assets[0];

    const translationRows = await this.dbService.db("file_translations")
      .where({ file_item_id: fileItemId })
      .select("lang", "title");
    const translations: FileTranslation[] = translationRows
      .filter((row: any) => row.lang)
      .map((row: any) => ({ lang: row.lang as Lang, title: row.title, description: null }));
    const title =
      translations.find((t) => t.lang === selected.lang)?.title ||
      (lang ? translations.find((t) => t.lang === lang)?.title : null) ||
      null;

    await this.downloadsService.log({
      userId: user.id,
      fileItemId: fileItemId,
      fileVersionId: file.current_version_id,
      fileVersionAssetId: selected.id,
      lang: selected.lang
    });

    return { ...selected, title };
  }

  async getUserMenu(user: any, preferredLang: string | null) {
    const departmentIds = await this.getDepartmentScopeIds(user.departmentId);
    const accessibleFileIds = await this.dbService.db("file_items")
      .select("file_items.id", "file_items.section_id", "file_items.category_id")
      .whereNull("file_items.deleted_at")
      .where((builder) => {
        builder.where("file_items.access_type", "public");
        if (departmentIds.length) {
          builder.orWhereIn("file_items.id", function () {
            this.select("file_item_id")
              .from("file_access_departments")
              .whereIn("department_id", departmentIds);
          });
        }
        builder.orWhereIn("file_items.id", function () {
          this.select("file_item_id").from("file_access_users").where("user_id", user.id);
        });
      });

    if (accessibleFileIds.length === 0) {
      return { sections: [], categories: [] };
    }

    const sectionIds = Array.from(new Set(accessibleFileIds.map((f: any) => f.section_id).filter(Boolean)));
    const categoryIds = Array.from(new Set(accessibleFileIds.map((f: any) => f.category_id).filter(Boolean)));

    const sectionsRows = sectionIds.length
      ? await this.dbService.db("sections")
          .leftJoin("sections_translations", "sections.id", "sections_translations.section_id")
          .whereIn("sections.id", sectionIds)
          .select("sections.id", "sections_translations.lang", "sections_translations.title")
      : [];

    const categoriesRows = categoryIds.length
      ? await this.dbService.db("categories")
          .leftJoin("categories_translations", "categories.id", "categories_translations.category_id")
          .whereIn("categories.id", categoryIds)
          .select(
            "categories.id",
            "categories.parent_id",
            "categories.depth",
            "categories_translations.lang",
            "categories_translations.title"
          )
      : [];

    return this.buildMenu(sectionsRows, categoriesRows, preferredLang);
  }

  async getUserMenuAll(preferredLang: string | null) {
    const sectionsRows = await this.dbService.db("sections")
      .leftJoin("sections_translations", "sections.id", "sections_translations.section_id")
      .select("sections.id", "sections_translations.lang", "sections_translations.title")
      .orderBy("sections.id", "asc");

    const categoriesRows = await this.dbService.db("categories")
      .leftJoin("categories_translations", "categories.id", "categories_translations.category_id")
      .select(
        "categories.id",
        "categories.parent_id",
        "categories.depth",
        "categories_translations.lang",
        "categories_translations.title"
      )
      .orderBy("categories.depth", "asc")
      .orderBy("categories.id", "asc");

    return this.buildMenu(sectionsRows, categoriesRows, preferredLang);
  }
}
