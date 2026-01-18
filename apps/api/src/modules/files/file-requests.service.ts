import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import path from "path";
import fs from "fs/promises";
import { v4 as uuidv4 } from "uuid";
import { DatabaseService } from "../../db/database.service";
import { AuditService } from "../audit/audit.service";
import { buildPaginationMeta } from "../../common/utils/pagination";
import { getAvailableLangs, normalizeLang, selectTranslation, Lang } from "../../common/utils/lang";

type FileRequestTranslation = { lang: Lang; title: string; description?: string | null };

@Injectable()
export class FileRequestsService {
  constructor(
    private readonly dbService: DatabaseService,
    private readonly config: ConfigService,
    private readonly auditService: AuditService
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
    return rows.map((row: any) => Number(row.id)).filter((id: number) => Number.isFinite(id));
  }

  private async assertUserCanSubmit(userId: number) {
    const user = await this.dbService.db("users")
      .select("id", "can_submit_files")
      .where({ id: userId })
      .whereNull("deleted_at")
      .first();
    if (!user || !user.can_submit_files) {
      throw new ForbiddenException("File submission is not allowed");
    }
  }

  private async normalizeAccess(dto: { accessType: string; accessDepartmentIds?: number[]; accessUserIds?: number[] }, user: any) {
    const accessType = dto.accessType === "public" ? "public" : "restricted";
    let accessDepartmentIds = (dto.accessDepartmentIds || []).map(Number).filter((id) => Number.isFinite(id));
    let accessUserIds = (dto.accessUserIds || []).map(Number).filter((id) => Number.isFinite(id));

    if (accessType === "restricted") {
      const allowedDepartmentIds = await this.getDepartmentScopeIds(user.departmentId ?? null);
      const allowedDeptSet = new Set(allowedDepartmentIds);
      const invalidDept = accessDepartmentIds.filter((id) => !allowedDeptSet.has(id));
      if (invalidDept.length > 0) {
        throw new BadRequestException("Department access not allowed");
      }

      let allowedUserIds: number[] = [];
      if (allowedDepartmentIds.length > 0) {
        allowedUserIds = await this.dbService.db("users")
          .whereNull("deleted_at")
          .whereIn("department_id", allowedDepartmentIds)
          .pluck("id");
      } else if (user?.id) {
        allowedUserIds = [user.id];
      }

      const allowedUserSet = new Set(allowedUserIds);
      const invalidUser = accessUserIds.filter((id) => !allowedUserSet.has(id));
      if (invalidUser.length > 0) {
        throw new BadRequestException("User access not allowed");
      }

      if (accessDepartmentIds.length === 0 && accessUserIds.length === 0) {
        if (user.departmentId) {
          accessDepartmentIds = [user.departmentId];
        } else if (user?.id) {
          accessUserIds = [user.id];
        }
      }
    } else {
      accessDepartmentIds = [];
      accessUserIds = [];
    }

    return { accessType, accessDepartmentIds, accessUserIds };
  }

  async getAccessOptions(user: any) {
    const departmentIds = await this.getDepartmentScopeIds(user.departmentId ?? null);
    const departments = departmentIds.length
      ? await this.dbService.db("departments")
          .select("id", "name", "parent_id", "depth")
          .whereIn("id", departmentIds)
          .orderBy("depth", "asc")
          .orderBy("id", "asc")
      : [];

    const users = departmentIds.length
      ? await this.dbService.db("users")
          .select("id", "login", "surname", "name", "patronymic", "department_id")
          .whereNull("deleted_at")
          .whereIn("department_id", departmentIds)
          .orderBy("login", "asc")
      : await this.dbService.db("users")
          .select("id", "login", "surname", "name", "patronymic", "department_id")
          .whereNull("deleted_at")
          .where({ id: user.id })
          .orderBy("login", "asc");

    return { departments, users };
  }

  async createRequest(dto: any, actor: any) {
    await this.assertUserCanSubmit(actor.id);

    if (!dto.translations || dto.translations.length === 0) {
      throw new BadRequestException("Translations required");
    }

    const section = await this.dbService.db("sections").where({ id: dto.sectionId }).first();
    if (!section) throw new BadRequestException("Section not found");
    const category = await this.dbService.db("categories").where({ id: dto.categoryId }).first();
    if (!category) throw new BadRequestException("Category not found");

    const normalizedTranslations = dto.translations.map((t: any) => ({
      lang: t.lang,
      title: String(t.title || "").trim(),
      description: t.description ? String(t.description).trim() || null : null
    })).filter((t: any) => t.title);

    if (normalizedTranslations.length === 0) {
      throw new BadRequestException("Translations required");
    }

    const { accessType, accessDepartmentIds, accessUserIds } = await this.normalizeAccess(dto, actor);
    const comment = dto.comment ? String(dto.comment).trim() || null : null;

    const [request] = await this.dbService.db("file_requests")
      .insert({
        section_id: dto.sectionId,
        category_id: dto.categoryId,
        access_type: accessType,
        status: "pending",
        comment,
        created_by: actor.id,
        created_at: this.dbService.db.fn.now(),
        updated_at: this.dbService.db.fn.now()
      })
      .returning("id");

    const requestId = request.id || request;

    await this.dbService.db("file_request_translations").insert(
      normalizedTranslations.map((t: any) => ({
        file_request_id: requestId,
        lang: t.lang,
        title: t.title,
        description: t.description
      }))
    );

    if (accessType === "restricted") {
      if (accessDepartmentIds.length > 0) {
        await this.dbService.db("file_request_access_departments").insert(
          accessDepartmentIds.map((id: number) => ({
            file_request_id: requestId,
            department_id: id
          }))
        );
      }
      if (accessUserIds.length > 0) {
        await this.dbService.db("file_request_access_users").insert(
          accessUserIds.map((id: number) => ({
            file_request_id: requestId,
            user_id: id
          }))
        );
      }
    }

    await this.auditService.log({
      actorUserId: actor.id,
      action: "FILE_REQUEST_CREATED",
      entityType: "FILE_REQUEST",
      entityId: requestId
    });

    return { id: requestId };
  }

  async uploadRequestAsset(requestId: number, lang: string, file: Express.Multer.File, actor: any) {
    if (!file) throw new BadRequestException("File is required");
    const request = await this.dbService.db("file_requests")
      .select("id", "created_by", "status")
      .where({ id: requestId })
      .first();
    if (!request) throw new NotFoundException();
    if (request.created_by !== actor.id) throw new ForbiddenException("Access denied");
    if (request.status !== "pending") throw new BadRequestException("Request is not pending");

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

    const newPath = await this.buildAssetPath(file.originalname);
    await this.ensureUploadDir(path.dirname(newPath));
    await fs.rename(file.path, newPath);

    const existing = await this.dbService.db("file_request_assets")
      .where({ file_request_id: requestId, lang })
      .first();
    if (existing) {
      await this.deleteFileSafe(existing.path);
      await this.dbService.db("file_request_assets").where({ id: existing.id }).delete();
    }

    const [asset] = await this.dbService.db("file_request_assets")
      .insert({
        file_request_id: requestId,
        lang,
        original_name: file.originalname,
        mime: file.mimetype,
        size: file.size,
        path: newPath,
        created_at: this.dbService.db.fn.now(),
        updated_at: this.dbService.db.fn.now()
      })
      .returning("id");

    await this.dbService.db("file_requests")
      .update({ updated_at: this.dbService.db.fn.now() })
      .where({ id: requestId });

    await this.auditService.log({
      actorUserId: actor.id,
      action: "FILE_REQUEST_ASSET_UPLOADED",
      entityType: "FILE_REQUEST",
      entityId: requestId,
      meta: { lang, size: file.size, originalName: file.originalname }
    });

    return { id: asset.id || asset };
  }

  async listUserRequests(
    params: { page: number; pageSize: number; status?: string; scope?: string; q?: string },
    user: any,
    preferredLang: string | null
  ) {
    const { page, pageSize, status, scope, q } = params;
    const db = this.dbService.db;
    const defaultLang = this.getDefaultLang();
    const lang = normalizeLang(preferredLang) || null;
    const query = db("file_requests")
      .leftJoin("file_request_translations", "file_requests.id", "file_request_translations.file_request_id")
      .select(
        "file_requests.id",
        "file_requests.section_id",
        "file_requests.category_id",
        "file_requests.access_type",
        "file_requests.status",
        "file_requests.comment",
        "file_requests.rejection_reason",
        "file_requests.created_at",
        "file_requests.updated_at",
        "file_requests.resolved_at",
        "file_request_translations.lang",
        "file_request_translations.title",
        "file_request_translations.description"
      )
      .where("file_requests.created_by", user.id);

    if (scope === "pending") {
      query.where("file_requests.status", "pending");
    } else if (scope === "history") {
      query.whereNot("file_requests.status", "pending");
    }

    if (status) {
      query.where("file_requests.status", status);
    }

    if (q) {
      query.where((builder) => {
        builder.whereILike("file_request_translations.title", `%${q}%`);
        builder.orWhereILike("file_request_translations.description", `%${q}%`);
        builder.orWhereILike("file_requests.comment", `%${q}%`);
      });
    }

    const countResult = await query
      .clone()
      .clearSelect()
      .clearOrder()
      .countDistinct<{ count: string }>("file_requests.id as count")
      .first();

    const rows = await query
      .orderBy("file_requests.created_at", "desc")
      .offset((page - 1) * pageSize)
      .limit(pageSize);

    type RequestRow = {
      id: number;
      section_id: number;
      category_id: number;
      access_type: string;
      status: string;
      comment?: string | null;
      rejection_reason?: string | null;
      created_at: string;
      updated_at: string;
      resolved_at?: string | null;
      translations: FileRequestTranslation[];
    };

    const grouped = new Map<number, RequestRow>();
    rows.forEach((row: any) => {
      if (!grouped.has(row.id)) {
        grouped.set(row.id, {
          id: row.id,
          section_id: row.section_id,
          category_id: row.category_id,
          access_type: row.access_type,
          status: row.status,
          comment: row.comment,
          rejection_reason: row.rejection_reason,
          created_at: row.created_at,
          updated_at: row.updated_at,
          resolved_at: row.resolved_at,
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

    const data = Array.from(grouped.values()).map((item) => {
      const picked = selectTranslation<FileRequestTranslation>(item.translations, lang, defaultLang);
      return {
        id: item.id,
        sectionId: item.section_id,
        categoryId: item.category_id,
        accessType: item.access_type,
        status: item.status,
        comment: item.comment || null,
        rejectionReason: item.rejection_reason || null,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        resolvedAt: item.resolved_at || null,
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

  async listAdminRequests(
    params: { page: number; pageSize: number; status?: string; scope?: string; q?: string },
    preferredLang: string | null
  ) {
    const { page, pageSize, status, scope, q } = params;
    const db = this.dbService.db;
    const defaultLang = this.getDefaultLang();
    const lang = normalizeLang(preferredLang) || null;
    const query = db("file_requests")
      .leftJoin("file_request_translations", "file_requests.id", "file_request_translations.file_request_id")
      .leftJoin("users", "users.id", "file_requests.created_by")
      .leftJoin("departments", "departments.id", "users.department_id")
      .select(
        "file_requests.id",
        "file_requests.section_id",
        "file_requests.category_id",
        "file_requests.access_type",
        "file_requests.status",
        "file_requests.comment",
        "file_requests.rejection_reason",
        "file_requests.created_at",
        "file_requests.updated_at",
        "file_requests.resolved_at",
        "file_request_translations.lang",
        "file_request_translations.title",
        "file_request_translations.description",
        "users.id as user_id",
        "users.login as user_login",
        "users.surname as user_surname",
        "users.name as user_name",
        "users.patronymic as user_patronymic",
        "departments.name as user_department"
      );

    if (scope === "pending") {
      query.where("file_requests.status", "pending");
    } else if (scope === "history") {
      query.whereNot("file_requests.status", "pending");
    }

    if (status) {
      query.where("file_requests.status", status);
    }

    if (q) {
      query.where((builder) => {
        builder.whereILike("file_request_translations.title", `%${q}%`);
        builder.orWhereILike("file_request_translations.description", `%${q}%`);
        builder.orWhereILike("file_requests.comment", `%${q}%`);
        builder.orWhereILike("users.login", `%${q}%`);
        builder.orWhereILike("users.surname", `%${q}%`);
        builder.orWhereILike("users.name", `%${q}%`);
        builder.orWhereILike("users.patronymic", `%${q}%`);
        builder.orWhereILike("departments.name", `%${q}%`);
      });
    }

    const countResult = await query
      .clone()
      .clearSelect()
      .clearOrder()
      .countDistinct<{ count: string }>("file_requests.id as count")
      .first();

    const rows = await query
      .orderBy("file_requests.created_at", "desc")
      .offset((page - 1) * pageSize)
      .limit(pageSize);

    type RequestRow = {
      id: number;
      section_id: number;
      category_id: number;
      access_type: string;
      status: string;
      comment?: string | null;
      rejection_reason?: string | null;
      created_at: string;
      updated_at: string;
      resolved_at?: string | null;
      user_id?: number | null;
      user_login?: string | null;
      user_surname?: string | null;
      user_name?: string | null;
      user_patronymic?: string | null;
      user_department?: string | null;
      translations: FileRequestTranslation[];
    };

    const grouped = new Map<number, RequestRow>();
    rows.forEach((row: any) => {
      if (!grouped.has(row.id)) {
        grouped.set(row.id, {
          id: row.id,
          section_id: row.section_id,
          category_id: row.category_id,
          access_type: row.access_type,
          status: row.status,
          comment: row.comment,
          rejection_reason: row.rejection_reason,
          created_at: row.created_at,
          updated_at: row.updated_at,
          resolved_at: row.resolved_at,
          user_id: row.user_id,
          user_login: row.user_login,
          user_surname: row.user_surname,
          user_name: row.user_name,
          user_patronymic: row.user_patronymic,
          user_department: row.user_department,
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

    const data = Array.from(grouped.values()).map((item) => {
      const picked = selectTranslation<FileRequestTranslation>(item.translations, lang, defaultLang);
      return {
        id: item.id,
        sectionId: item.section_id,
        categoryId: item.category_id,
        accessType: item.access_type,
        status: item.status,
        comment: item.comment || null,
        rejectionReason: item.rejection_reason || null,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        resolvedAt: item.resolved_at || null,
        title: picked?.title || null,
        description: picked?.description || null,
        availableLangs: getAvailableLangs(item.translations),
        createdBy: item.user_id
          ? {
              id: item.user_id,
              login: item.user_login,
              fullName: [item.user_surname, item.user_name, item.user_patronymic].filter(Boolean).join(" "),
              department: item.user_department || null
            }
          : null
      };
    });

    return {
      data,
      meta: buildPaginationMeta(page, pageSize, Number(countResult?.count || 0))
    };
  }

  async listRequestAssets(requestId: number) {
    const request = await this.dbService.db("file_requests").where({ id: requestId }).first();
    if (!request) throw new NotFoundException();

    const assets = await this.dbService.db("file_request_assets")
      .where({ file_request_id: requestId })
      .orderBy("lang", "asc");

    const data = assets.map((asset: any) => ({
      id: asset.id,
      lang: asset.lang,
      originalName: asset.original_name,
      mime: asset.mime,
      size: asset.size,
      createdAt: asset.created_at
    }));

    return { data };
  }

  async getRequestAsset(requestId: number, assetId: number) {
    const asset = await this.dbService.db("file_request_assets")
      .where({ id: assetId, file_request_id: requestId })
      .first();
    if (!asset) throw new NotFoundException();

    return asset;
  }

  async cancelRequest(requestId: number, actor: any) {
    const request = await this.dbService.db("file_requests")
      .select("id", "created_by", "status")
      .where({ id: requestId })
      .first();
    if (!request) throw new NotFoundException();
    if (request.created_by !== actor.id) throw new ForbiddenException("Access denied");
    if (request.status !== "pending") throw new BadRequestException("Request is not pending");

    await this.dbService.db("file_requests")
      .update({
        status: "canceled",
        resolved_by: actor.id,
        resolved_at: this.dbService.db.fn.now(),
        updated_at: this.dbService.db.fn.now()
      })
      .where({ id: requestId });

    await this.deleteRequestAssets(requestId);

    await this.auditService.log({
      actorUserId: actor.id,
      action: "FILE_REQUEST_CANCELED",
      entityType: "FILE_REQUEST",
      entityId: requestId
    });

    return { success: true };
  }

  async approveRequest(requestId: number, actor: any) {
    const request = await this.dbService.db("file_requests")
      .where({ id: requestId })
      .first();
    if (!request) throw new NotFoundException();
    if (request.status !== "pending") throw new BadRequestException("Request is not pending");

    const translations = await this.dbService.db("file_request_translations")
      .where({ file_request_id: requestId });
    const assets = await this.dbService.db("file_request_assets")
      .where({ file_request_id: requestId });

    if (!assets.length) {
      throw new BadRequestException("Request assets missing");
    }

    const accessDepartments = await this.dbService.db("file_request_access_departments")
      .where({ file_request_id: requestId })
      .pluck("department_id");
    const accessUsersRaw = await this.dbService.db("file_request_access_users")
      .where({ file_request_id: requestId })
      .pluck("user_id");
    const accessUserSet = new Set<number>(accessUsersRaw.map((id: number) => Number(id)));
    if (request.created_by) {
      accessUserSet.add(request.created_by);
    }
    const accessUsers = Array.from(accessUserSet);

    const now = this.dbService.db.fn.now();

    const { fileItemId, versionId } = await this.dbService.db.transaction(async (trx) => {
      const [fileItem] = await trx("file_items")
        .insert({
          section_id: request.section_id,
          category_id: request.category_id,
          access_type: request.access_type,
          created_by: request.created_by,
          created_at: now,
          updated_at: now
        })
        .returning("id");

      const fileItemId = fileItem.id || fileItem;

      const [version] = await trx("file_versions")
        .insert({
          file_item_id: fileItemId,
          version_number: 1,
          comment: null,
          created_by: request.created_by,
          created_at: now,
          updated_at: now
        })
        .returning("id");

      const versionId = version.id || version;

      await trx("file_items").update({ current_version_id: versionId }).where({ id: fileItemId });

      await trx("file_translations").insert(
        translations.map((t: any) => ({
          file_item_id: fileItemId,
          lang: t.lang,
          title: t.title,
          description: t.description || null
        }))
      );

      if (request.access_type === "restricted" && accessDepartments.length) {
        await trx("file_access_departments").insert(
          accessDepartments.map((id: number) => ({
            file_item_id: fileItemId,
            department_id: id
          }))
        );
      }
      if (accessUsers.length) {
        await trx("file_access_users").insert(
          accessUsers.map((id: number) => ({
            file_item_id: fileItemId,
            user_id: id
          }))
        );
      }

      await trx("file_version_assets").insert(
        assets.map((asset: any) => ({
          file_version_id: versionId,
          lang: asset.lang,
          original_name: asset.original_name,
          mime: asset.mime,
          size: asset.size,
          path: asset.path,
          checksum: asset.checksum || null,
          created_at: now,
          updated_at: now
        }))
      );

      await trx("file_requests")
        .update({
          status: "approved",
          rejection_reason: null,
          resolved_by: actor.id,
          resolved_at: now,
          updated_at: now
        })
        .where({ id: requestId });

      await trx("file_request_assets").where({ file_request_id: requestId }).delete();

      return { fileItemId, versionId };
    });

    await this.auditService.log({
      actorUserId: actor.id,
      action: "FILE_REQUEST_APPROVED",
      entityType: "FILE_REQUEST",
      entityId: requestId
    });

    await this.auditService.log({
      actorUserId: actor.id,
      action: "FILE_CREATED",
      entityType: "FILE",
      entityId: fileItemId
    });

    await this.auditService.log({
      actorUserId: actor.id,
      action: "FILE_VERSION_CREATED",
      entityType: "FILE_VERSION",
      entityId: versionId,
      meta: { versionNumber: 1 }
    });

    return { fileItemId };
  }

  async rejectRequest(requestId: number, actor: any, reason?: string | null) {
    const request = await this.dbService.db("file_requests")
      .select("id", "status")
      .where({ id: requestId })
      .first();
    if (!request) throw new NotFoundException();
    if (request.status !== "pending") throw new BadRequestException("Request is not pending");

    const rejectionReason = reason ? String(reason).trim() || null : null;
    await this.dbService.db("file_requests")
      .update({
        status: "rejected",
        rejection_reason: rejectionReason,
        resolved_by: actor.id,
        resolved_at: this.dbService.db.fn.now(),
        updated_at: this.dbService.db.fn.now()
      })
      .where({ id: requestId });

    await this.deleteRequestAssets(requestId);

    await this.auditService.log({
      actorUserId: actor.id,
      action: "FILE_REQUEST_REJECTED",
      entityType: "FILE_REQUEST",
      entityId: requestId
    });

    return { success: true };
  }

  private async deleteRequestAssets(requestId: number) {
    const assets = await this.dbService.db("file_request_assets")
      .where({ file_request_id: requestId })
      .select("id", "path");
    for (const asset of assets) {
      await this.deleteFileSafe(asset.path);
    }
    await this.dbService.db("file_request_assets").where({ file_request_id: requestId }).delete();
  }
}
