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

  private async deleteFileSafe(filePath: string) {
    try {
      await fs.unlink(filePath);
    } catch (_err) {
      return;
    }
  }

  private buildAssetPath(fileItemId: number, versionId: number, lang: string, originalName: string) {
    const ext = path.extname(originalName) || "";
    const name = `${uuidv4()}${ext}`;
    return path.join(this.getUploadDir(), `file_items/${fileItemId}/v${versionId}/${lang}/${name}`);
  }

  private async validateAccess(user: any, fileItemId: number) {
    const file = await this.dbService.db("file_items")
      .select("id", "access_type")
      .where({ id: fileItemId })
      .whereNull("deleted_at")
      .first();
    if (!file) throw new NotFoundException();
    if (file.access_type === "public") return;

    const hasDept = user.departmentId
      ? await this.dbService.db("file_access_departments")
          .where({ file_item_id: fileItemId, department_id: user.departmentId })
          .first()
      : null;
    const hasUser = await this.dbService.db("file_access_users")
      .where({ file_item_id: fileItemId, user_id: user.id })
      .first();

    if (!hasDept && !hasUser) {
      throw new ForbiddenException("Access denied");
    }
  }

  async listManage(params: { page: number; pageSize: number; q?: string; sortBy?: string; sortDir?: string }, preferredLang: string | null) {
    const { page, pageSize, q, sortBy, sortDir } = params;
    const query = this.dbService.db("file_items")
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
      query.orderBy("file_translations.title", direction);
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

    const defaultLang = this.getDefaultLang();
    const lang = normalizeLang(preferredLang) || null;

    const data = Array.from(grouped.values()).map((item) => {
      const picked = selectTranslation<FileTranslation>(item.translations, lang, defaultLang);
      return {
        id: item.id,
        sectionId: item.section_id,
        categoryId: item.category_id,
        accessType: item.access_type,
        currentVersionId: item.current_version_id,
        title: picked?.title || null,
        description: picked?.description || null,
        availableLangs: getAvailableLangs(item.translations)
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
      const category = await trx("categories").where({ id: dto.categoryId }).first();
      if (!category) throw new BadRequestException("Category not found");
      if (category.section_id !== dto.sectionId) {
        throw new BadRequestException("Category is not in section");
      }

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
        const category = await trx("categories").where({ id: categoryId }).first();
        if (!category) throw new BadRequestException("Category not found");
        if (category.section_id !== sectionId) {
          throw new BadRequestException("Category is not in section");
        }
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
    const query = this.dbService.db("file_items")
      .leftJoin("file_translations", "file_items.id", "file_translations.file_item_id")
      .select(
        "file_items.id",
        "file_items.deleted_at",
        "file_translations.lang",
        "file_translations.title",
        "file_translations.description"
      )
      .whereNotNull("file_items.deleted_at");

    if (q) query.whereILike("file_translations.title", `%${q}%`);

    const countResult = await query
      .clone()
      .clearSelect()
      .clearOrder()
      .countDistinct<{ count: string }>("file_items.id as count")
      .first();
    const rows = await query.offset((page - 1) * pageSize).limit(pageSize);

    type TrashRow = { id: number; deleted_at: string | null; translations: FileTranslation[] };
    const grouped = new Map<number, TrashRow>();
    rows.forEach((row: any) => {
      if (!grouped.has(row.id)) {
        grouped.set(row.id, { id: row.id, deleted_at: row.deleted_at, translations: [] });
      }
      const current = grouped.get(row.id);
      if (row.lang && current) {
        current.translations.push({ lang: row.lang, title: row.title, description: row.description });
      }
    });

    const defaultLang = this.getDefaultLang();
    const lang = normalizeLang(preferredLang) || null;

    const data = Array.from(grouped.values()).map((item) => {
      const picked = selectTranslation<FileTranslation>(item.translations, lang, defaultLang);
      return {
        id: item.id,
        title: picked?.title || null,
        description: picked?.description || null,
        availableLangs: getAvailableLangs(item.translations),
        deletedAt: item.deleted_at
      };
    });

    return { data, meta: buildPaginationMeta(page, pageSize, Number(countResult?.count || 0)) };
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
          const newPath = this.buildAssetPath(fileItemId, versionId, asset.lang, asset.original_name);
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

    await this.dbService.db("file_versions")
      .where({ id: versionId })
      .update({ deleted_at: this.dbService.db.fn.now() });

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

    await this.dbService.db("file_versions").update({ deleted_at: null }).where({ id: versionId });

    await this.auditService.log({
      actorUserId: actorId,
      action: "FILE_VERSION_RESTORED",
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

    const newPath = this.buildAssetPath(fileItemId, versionId, lang, file.originalname);
    await this.ensureUploadDir(path.dirname(newPath));
    await fs.rename(file.path, newPath);

    const existing = await this.dbService.db("file_version_assets")
      .where({ file_version_id: versionId, lang })
      .first();
    if (existing) {
      await this.deleteFileSafe(existing.path);
      await this.dbService.db("file_version_assets").where({ id: existing.id }).delete();
    }

    const [asset] = await this.dbService.db("file_version_assets")
      .insert({
        file_version_id: versionId,
        lang,
        original_name: file.originalname,
        mime: file.mimetype,
        size: file.size,
        path: newPath,
        created_at: this.dbService.db.fn.now(),
        updated_at: this.dbService.db.fn.now()
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

    await this.deleteFileSafe(asset.path);
    await this.dbService.db("file_version_assets").where({ id: assetId }).delete();

    await this.auditService.log({
      actorUserId: actorId,
      action: "FILE_ASSET_DELETED",
      entityType: "FILE_VERSION",
      entityId: versionId,
      meta: { lang: asset.lang }
    });

    return { success: true };
  }

  async listUserFiles(params: { page: number; pageSize: number; q?: string; sortBy?: string; sortDir?: string }, user: any, preferredLang: string | null) {
    const { page, pageSize, q, sortBy, sortDir } = params;
    const query = this.dbService.db("file_items")
      .leftJoin("file_translations", "file_items.id", "file_translations.file_item_id")
      .select(
        "file_items.id",
        "file_items.section_id",
        "file_items.category_id",
        "file_items.access_type",
        "file_items.current_version_id",
        "file_items.created_at",
        "file_translations.lang",
        "file_translations.title",
        "file_translations.description"
      )
      .whereNull("file_items.deleted_at")
      .where((builder) => {
        builder.where("file_items.access_type", "public");
        if (user.departmentId) {
          builder.orWhereIn("file_items.id", function () {
            this.select("file_item_id")
              .from("file_access_departments")
              .where("department_id", user.departmentId);
          });
        }
        builder.orWhereIn("file_items.id", function () {
          this.select("file_item_id").from("file_access_users").where("user_id", user.id);
        });
      });

    if (q) {
      query.whereILike("file_translations.title", `%${q}%`);
    }

    const direction = sortDir === "asc" ? "asc" : "desc";
    if (sortBy === "title") {
      query.orderBy("file_translations.title", direction);
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

    const defaultLang = this.getDefaultLang();
    const lang = normalizeLang(preferredLang) || null;

    const data = Array.from(grouped.values()).map((item) => {
      const picked = selectTranslation<FileTranslation>(item.translations, lang, defaultLang);
      return {
        id: item.id,
        sectionId: item.section_id,
        categoryId: item.category_id,
        title: picked?.title || null,
        description: picked?.description || null,
        availableLangs: getAvailableLangs(item.translations)
      };
    });

    return { data, meta: buildPaginationMeta(page, pageSize, Number(countResult?.count || 0)) };
  }

  async getUserFile(fileItemId: number, user: any, preferredLang: string | null) {
    await this.validateAccess(user, fileItemId);

    const rows = await this.dbService.db("file_items")
      .leftJoin("file_translations", "file_items.id", "file_translations.file_item_id")
      .select(
        "file_items.id",
        "file_items.section_id",
        "file_items.category_id",
        "file_items.access_type",
        "file_items.current_version_id",
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
      .select("id", "lang", "original_name", "size", "mime");

    return {
      id: fileItemId,
      sectionId: rows[0].section_id,
      categoryId: rows[0].category_id,
      title: picked?.title || null,
      description: picked?.description || null,
      availableLangs: getAvailableLangs(translations),
      assets
    };
  }

  async download(fileItemId: number, user: any, preferredLang: string | null) {
    await this.validateAccess(user, fileItemId);

    const file = await this.dbService.db("file_items").where({ id: fileItemId }).first();
    if (!file || !file.current_version_id) throw new NotFoundException();

    const assets = await this.dbService.db("file_version_assets")
      .where({ file_version_id: file.current_version_id })
      .select("id", "lang", "path", "original_name", "mime");
    if (!assets.length) throw new NotFoundException("No assets");

    const defaultLang = this.getDefaultLang();
    const lang = normalizeLang(preferredLang) || null;
    const selected = assets.find((a) => a.lang === (lang || defaultLang)) || assets.find((a) => a.lang === defaultLang) || assets[0];

    await this.downloadsService.log({
      userId: user.id,
      fileItemId: fileItemId,
      fileVersionId: file.current_version_id,
      fileVersionAssetId: selected.id,
      lang: selected.lang
    });

    return selected;
  }

  async getUserMenu(user: any, preferredLang: string | null) {
    const accessibleFileIds = await this.dbService.db("file_items")
      .select("file_items.id", "file_items.section_id", "file_items.category_id")
      .whereNull("file_items.deleted_at")
      .where((builder) => {
        builder.where("file_items.access_type", "public");
        if (user.departmentId) {
          builder.orWhereIn("file_items.id", function () {
            this.select("file_item_id")
              .from("file_access_departments")
              .where("department_id", user.departmentId);
          });
        }
        builder.orWhereIn("file_items.id", function () {
          this.select("file_item_id").from("file_access_users").where("user_id", user.id);
        });
      });

    const sectionIds = Array.from(new Set(accessibleFileIds.map((f: any) => f.section_id)));
    const categoryIds = Array.from(new Set(accessibleFileIds.map((f: any) => f.category_id)));

    if (sectionIds.length === 0) {
      return { sections: [], categories: [] };
    }

    const sectionsRows = await this.dbService.db("sections")
      .leftJoin("sections_translations", "sections.id", "sections_translations.section_id")
      .whereIn("sections.id", sectionIds)
      .select("sections.id", "sections_translations.lang", "sections_translations.title");

    const categoriesRows = await this.dbService.db("categories")
      .leftJoin("categories_translations", "categories.id", "categories_translations.category_id")
      .whereIn("categories.id", categoryIds)
      .select("categories.id", "categories.section_id", "categories.parent_id", "categories_translations.lang", "categories_translations.title");

    const defaultLang = this.getDefaultLang();
    const lang = normalizeLang(preferredLang) || null;

    type MenuTranslation = { lang: Lang; title: string };
    type MenuSection = { id: number; translations: MenuTranslation[] };
    type MenuCategory = { id: number; sectionId: number; parentId: number | null; translations: MenuTranslation[] };

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
          sectionId: row.section_id,
          parentId: row.parent_id,
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
        sectionId: c.sectionId,
        parentId: c.parentId,
        title: picked?.title || null,
        availableLangs: getAvailableLangs(c.translations)
      };
    });

    return { sections, categories };
  }
}
