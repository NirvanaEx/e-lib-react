import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import fs from "fs/promises";
import path from "path";
import { DatabaseService } from "../../db/database.service";
import { buildPaginationMeta } from "../../common/utils/pagination";
import { normalizeLang } from "../../common/utils/lang";

type Range = { from?: string; to?: string };

export type ActivityRow = {
  id: string;
  action: "download" | "view";
  createdAt: string;
  source: string | null;
  lang: string | null;
  ip: string | null;
  userAgent: string | null;
  user: { id: number; login: string | null; fullName: string | null; department: string | null } | null;
  file: { id: number; title: string | null } | null;
  versionNumber: number | null;
  assetName: string | null;
};

@Injectable()
export class StatsService {
  constructor(private readonly dbService: DatabaseService, private readonly config: ConfigService) {}

  private getDefaultLang() {
    return normalizeLang(this.config.get<string>("DEFAULT_DATA_LANG", "ru")) || "ru";
  }

  private getUploadDir() {
    const dir = this.config.get<string>("UPLOAD_DIR", "uploads");
    return path.isAbsolute(dir) ? dir : path.resolve(process.cwd(), dir);
  }

  // The UI sends plain dates. "to" must cover the whole day, so it becomes an
  // exclusive bound at the start of the next day.
  private resolveRange(range: Range) {
    const from = range.from ? new Date(`${range.from}T00:00:00`) : null;
    let toExclusive: Date | null = null;
    if (range.to) {
      const parsed = new Date(`${range.to}T00:00:00`);
      if (!Number.isNaN(parsed.getTime())) {
        parsed.setDate(parsed.getDate() + 1);
        toExclusive = parsed;
      }
    }
    return {
      from: from && !Number.isNaN(from.getTime()) ? from : null,
      toExclusive
    };
  }

  private applyRange(query: any, column: string, range: Range) {
    const { from, toExclusive } = this.resolveRange(range);
    if (from) query.where(column, ">=", from);
    if (toExclusive) query.where(column, "<", toExclusive);
    return query;
  }

  // Window of the same length immediately before the selected one, used for
  // the "vs previous period" deltas on the overview cards.
  private getPreviousRange(range: Range): Range | null {
    const { from, toExclusive } = this.resolveRange(range);
    if (!from || !toExclusive) return null;
    const span = toExclusive.getTime() - from.getTime();
    if (span <= 0) return null;
    const dayMs = 24 * 60 * 60 * 1000;
    const prevFrom = new Date(from.getTime() - span);
    // resolveRange pushes "to" to the next day, so step one day back to keep
    // the previous window exactly as long as the selected one.
    const prevTo = new Date(from.getTime() - dayMs);
    return {
      from: prevFrom.toISOString().slice(0, 10),
      to: prevTo.toISOString().slice(0, 10)
    };
  }

  private titleJoin(alias: string, itemColumn: string, lang: string) {
    const db = this.dbService.db;
    return function (this: any) {
      this.on(`${alias}.file_item_id`, "=", itemColumn).andOn(`${alias}.lang`, "=", db.raw("?", [lang]));
    };
  }

  private async countIn(table: string, range: Range) {
    const query = this.dbService.db(table).count<{ count: string }>("id as count");
    this.applyRange(query, `${table}.created_at`, range);
    const row = await query.first();
    return Number(row?.count || 0);
  }

  private async countDistinctUsers(table: string, range: Range) {
    const query = this.dbService
      .db(table)
      .countDistinct<{ count: string }>("user_id as count")
      .whereNotNull("user_id");
    this.applyRange(query, `${table}.created_at`, range);
    const row = await query.first();
    return Number(row?.count || 0);
  }

  async overview(range: Range) {
    const db = this.dbService.db;

    const [downloads, views, downloadUsers, viewUsers] = await Promise.all([
      this.countIn("downloads", range),
      this.countIn("file_views", range),
      this.countDistinctUsers("downloads", range),
      this.countDistinctUsers("file_views", range)
    ]);

    // Distinct users across both tables, not the sum of the two counts.
    const activeUsersQuery = db
      .from(
        db
          .unionAll(
            [
              this.applyRange(db("downloads").select("user_id").whereNotNull("user_id"), "created_at", range),
              this.applyRange(db("file_views").select("user_id").whereNotNull("user_id"), "created_at", range)
            ],
            true
          )
          .as("activity")
      )
      .countDistinct<{ count: string }>("user_id as count")
      .first();

    const [activeUsersRow, filesRow, newFilesRow, usersRow] = await Promise.all([
      activeUsersQuery,
      db("file_items").whereNull("deleted_at").count<{ count: string }>("id as count").first(),
      this.applyRange(
        db("file_items").whereNull("deleted_at").count<{ count: string }>("id as count"),
        "created_at",
        range
      ).first(),
      db("users").whereNull("deleted_at").count<{ count: string }>("id as count").first()
    ]);

    const previous = this.getPreviousRange(range);
    const previousTotals = previous
      ? {
          downloads: await this.countIn("downloads", previous),
          views: await this.countIn("file_views", previous)
        }
      : null;

    return {
      range: { from: range.from || null, to: range.to || null },
      downloads,
      views,
      downloadUsers,
      viewUsers,
      activeUsers: Number(activeUsersRow?.count || 0),
      totalFiles: Number(filesRow?.count || 0),
      newFiles: Number(newFilesRow?.count || 0),
      totalUsers: Number(usersRow?.count || 0),
      previous: previousTotals
    };
  }

  // Downloads and views merged into one feed: who, when, what, from where.
  private buildActivityUnion(params: {
    range: Range;
    userId?: number;
    fileItemId?: number;
    action?: string;
  }) {
    const db = this.dbService.db;
    const { range, userId, fileItemId, action } = params;

    const downloadsQuery = db("downloads as d").select(
      db.raw("'download' as action"),
      "d.id as source_id",
      "d.created_at as created_at",
      "d.user_id as user_id",
      "d.file_item_id as file_item_id",
      "d.file_version_id as file_version_id",
      "d.file_version_asset_id as asset_id",
      "d.lang as lang",
      "d.ip as ip",
      "d.user_agent as user_agent",
      db.raw("null::text as view_source")
    );
    this.applyRange(downloadsQuery, "d.created_at", range);
    if (userId) downloadsQuery.where("d.user_id", userId);
    if (fileItemId) downloadsQuery.where("d.file_item_id", fileItemId);

    const viewsQuery = db("file_views as v").select(
      db.raw("'view' as action"),
      "v.id as source_id",
      "v.created_at as created_at",
      "v.user_id as user_id",
      "v.file_item_id as file_item_id",
      "v.file_version_id as file_version_id",
      db.raw("null::int as asset_id"),
      "v.lang as lang",
      "v.ip as ip",
      "v.user_agent as user_agent",
      "v.source as view_source"
    );
    this.applyRange(viewsQuery, "v.created_at", range);
    if (userId) viewsQuery.where("v.user_id", userId);
    if (fileItemId) viewsQuery.where("v.file_item_id", fileItemId);

    if (action === "download") return db.unionAll([downloadsQuery], true);
    if (action === "view") return db.unionAll([viewsQuery], true);
    return db.unionAll([downloadsQuery, viewsQuery], true);
  }

  private buildActivityQuery(
    params: {
      range: Range;
      userId?: number;
      fileItemId?: number;
      departmentId?: number;
      action?: string;
      q?: string;
    },
    preferredLang: string | null
  ) {
    const db = this.dbService.db;
    const lang = normalizeLang(preferredLang) || this.getDefaultLang();
    const defaultLang = this.getDefaultLang();

    const query = db
      .from(this.buildActivityUnion(params).as("activity"))
      .leftJoin("users", "users.id", "activity.user_id")
      .leftJoin("departments", "departments.id", "users.department_id")
      .leftJoin("file_versions", "file_versions.id", "activity.file_version_id")
      .leftJoin("file_version_assets", "file_version_assets.id", "activity.asset_id")
      .leftJoin({ ft_pref: "file_translations" }, this.titleJoin("ft_pref", "activity.file_item_id", lang))
      .leftJoin({ ft_def: "file_translations" }, this.titleJoin("ft_def", "activity.file_item_id", defaultLang));

    if (params.departmentId) {
      query.where("users.department_id", params.departmentId);
    }

    if (params.q) {
      const like = `%${params.q}%`;
      query.where((builder: any) => {
        builder
          .whereILike("users.login", like)
          .orWhereILike("users.surname", like)
          .orWhereILike("users.name", like)
          .orWhereILike("users.patronymic", like)
          .orWhereILike("departments.name", like)
          .orWhereILike("ft_pref.title", like)
          .orWhereILike("ft_def.title", like)
          .orWhereILike("activity.ip", like);
      });
    }

    return query;
  }

  async activity(
    params: {
      page: number;
      pageSize: number;
      from?: string;
      to?: string;
      userId?: number;
      fileItemId?: number;
      departmentId?: number;
      action?: string;
      q?: string;
      sortDir?: string;
    },
    preferredLang: string | null
  ) {
    const db = this.dbService.db;
    const { page, pageSize } = params;
    const direction = params.sortDir === "asc" ? "asc" : "desc";
    const queryParams = {
      range: { from: params.from, to: params.to },
      userId: params.userId,
      fileItemId: params.fileItemId,
      departmentId: params.departmentId,
      action: params.action,
      q: params.q
    };

    const countRow = await this.buildActivityQuery(queryParams, preferredLang)
      .count<{ count: string }>("activity.source_id as count")
      .first();

    const rows = await this.buildActivityQuery(queryParams, preferredLang)
      .select(
        "activity.action",
        "activity.source_id",
        "activity.created_at",
        "activity.lang",
        "activity.ip",
        "activity.user_agent",
        "activity.view_source",
        "activity.file_item_id",
        "users.id as user_id",
        "users.login as user_login",
        "users.surname as user_surname",
        "users.name as user_name",
        "users.patronymic as user_patronymic",
        "departments.name as user_department",
        "file_versions.version_number as version_number",
        "file_version_assets.original_name as asset_name",
        db.raw("coalesce(??, ??) as title", ["ft_pref.title", "ft_def.title"])
      )
      .orderBy("activity.created_at", direction)
      .orderBy("activity.source_id", direction)
      .offset((page - 1) * pageSize)
      .limit(pageSize);

    const data: ActivityRow[] = rows.map((row: any) => ({
      id: `${row.action}-${row.source_id}`,
      action: row.action,
      createdAt: row.created_at,
      source: row.view_source || null,
      lang: row.lang || null,
      ip: row.ip || null,
      userAgent: row.user_agent || null,
      user: row.user_id
        ? {
            id: row.user_id,
            login: row.user_login,
            fullName:
              [row.user_surname, row.user_name, row.user_patronymic].filter(Boolean).join(" ").trim() || null,
            department: row.user_department || null
          }
        : null,
      file: row.file_item_id ? { id: row.file_item_id, title: row.title || null } : null,
      versionNumber: row.version_number ?? null,
      assetName: row.asset_name || null
    }));

    return {
      data,
      meta: buildPaginationMeta(page, pageSize, Number(countRow?.count || 0))
    };
  }

  async topFiles(params: { from?: string; to?: string; limit?: number }, preferredLang: string | null) {
    const db = this.dbService.db;
    const lang = normalizeLang(preferredLang) || this.getDefaultLang();
    const defaultLang = this.getDefaultLang();
    const limit = Math.min(50, Math.max(1, Number(params.limit || 10)));
    const range = { from: params.from, to: params.to };

    const rows = await db
      .from(this.buildActivityUnion({ range }).as("activity"))
      .leftJoin({ ft_pref: "file_translations" }, this.titleJoin("ft_pref", "activity.file_item_id", lang))
      .leftJoin({ ft_def: "file_translations" }, this.titleJoin("ft_def", "activity.file_item_id", defaultLang))
      .leftJoin("file_items", "file_items.id", "activity.file_item_id")
      .whereNotNull("activity.file_item_id")
      .groupBy("activity.file_item_id", "ft_pref.title", "ft_def.title", "file_items.access_type")
      .select(
        "activity.file_item_id as file_item_id",
        "file_items.access_type as access_type",
        db.raw("coalesce(??, ??) as title", ["ft_pref.title", "ft_def.title"]),
        db.raw("count(*) filter (where activity.action = 'download') as downloads"),
        db.raw("count(*) filter (where activity.action = 'view') as views"),
        db.raw("count(distinct activity.user_id) as unique_users"),
        db.raw("max(activity.created_at) as last_activity")
      )
      .orderByRaw("count(*) filter (where activity.action = 'download') desc, count(*) desc")
      .limit(limit);

    return {
      data: rows.map((row: any) => ({
        fileItemId: row.file_item_id,
        title: row.title || null,
        accessType: row.access_type || null,
        downloads: Number(row.downloads || 0),
        views: Number(row.views || 0),
        uniqueUsers: Number(row.unique_users || 0),
        lastActivity: row.last_activity || null
      }))
    };
  }

  async topUsers(params: { from?: string; to?: string; limit?: number }) {
    const db = this.dbService.db;
    const limit = Math.min(50, Math.max(1, Number(params.limit || 10)));
    const range = { from: params.from, to: params.to };

    const rows = await db
      .from(this.buildActivityUnion({ range }).as("activity"))
      .leftJoin("users", "users.id", "activity.user_id")
      .leftJoin("departments", "departments.id", "users.department_id")
      .whereNotNull("activity.user_id")
      .groupBy(
        "activity.user_id",
        "users.login",
        "users.surname",
        "users.name",
        "users.patronymic",
        "departments.name"
      )
      .select(
        "activity.user_id as user_id",
        "users.login as login",
        "users.surname as surname",
        "users.name as name",
        "users.patronymic as patronymic",
        "departments.name as department",
        db.raw("count(*) filter (where activity.action = 'download') as downloads"),
        db.raw("count(*) filter (where activity.action = 'view') as views"),
        db.raw("count(distinct activity.file_item_id) as unique_files"),
        db.raw("max(activity.created_at) as last_activity")
      )
      .orderByRaw("count(*) desc")
      .limit(limit);

    return {
      data: rows.map((row: any) => ({
        userId: row.user_id,
        login: row.login || null,
        fullName: [row.surname, row.name, row.patronymic].filter(Boolean).join(" ").trim() || null,
        department: row.department || null,
        downloads: Number(row.downloads || 0),
        views: Number(row.views || 0),
        uniqueFiles: Number(row.unique_files || 0),
        lastActivity: row.last_activity || null
      }))
    };
  }

  async byDepartment(params: { from?: string; to?: string }) {
    const db = this.dbService.db;
    const range = { from: params.from, to: params.to };

    const rows = await db
      .from(this.buildActivityUnion({ range }).as("activity"))
      .leftJoin("users", "users.id", "activity.user_id")
      .leftJoin("departments", "departments.id", "users.department_id")
      .groupBy("departments.id", "departments.name")
      .select(
        "departments.id as department_id",
        "departments.name as department",
        db.raw("count(*) filter (where activity.action = 'download') as downloads"),
        db.raw("count(*) filter (where activity.action = 'view') as views"),
        db.raw("count(distinct activity.user_id) as users")
      )
      .orderByRaw("count(*) desc")
      .limit(20);

    return {
      data: rows.map((row: any) => ({
        departmentId: row.department_id || null,
        department: row.department || null,
        downloads: Number(row.downloads || 0),
        views: Number(row.views || 0),
        users: Number(row.users || 0)
      }))
    };
  }

  async byPeriod(params: { from?: string; to?: string; bucket?: string }) {
    // Whitelisted before interpolation into date_trunc.
    const bucket = params.bucket === "month" || params.bucket === "week" ? params.bucket : "day";
    const db = this.dbService.db;
    const range = { from: params.from, to: params.to };

    const rows = await db
      .from(this.buildActivityUnion({ range }).as("activity"))
      .select(db.raw(`date_trunc('${bucket}', activity.created_at) as bucket`))
      .select(
        db.raw("count(*) filter (where activity.action = 'download') as downloads"),
        db.raw("count(*) filter (where activity.action = 'view') as views")
      )
      .groupBy("bucket")
      .orderBy("bucket", "asc");

    return {
      data: rows.map((row: any) => ({
        bucket: row.bucket,
        downloads: Number(row.downloads || 0),
        views: Number(row.views || 0)
      }))
    };
  }

  // Free space on the volume that holds the uploads directory. Gives the
  // sidebar widget a meaningful denominator when no quota is configured.
  private async getDiskUsage() {
    try {
      const statfs = (fs as any).statfs;
      if (typeof statfs !== "function") return null;
      const stats = await statfs(this.getUploadDir());
      const total = Number(stats.blocks) * Number(stats.bsize);
      const free = Number(stats.bavail) * Number(stats.bsize);
      if (!Number.isFinite(total) || total <= 0) return null;
      return { diskTotalBytes: total, diskFreeBytes: Number.isFinite(free) ? free : 0 };
    } catch (_err) {
      return null;
    }
  }

  async storageUsage() {
    const db = this.dbService.db;
    const totalBytesRow = await db("file_version_assets").sum<{ size: string }>("size as size").first();
    const assetCountRow = await db("file_version_assets").count<{ count: string }>("id as count").first();
    const fileCountRow = await db("file_items").whereNull("deleted_at").count<{ count: string }>("id as count").first();

    const currentBytesRow = await db("file_items")
      .leftJoin("file_versions", "file_versions.id", "file_items.current_version_id")
      .leftJoin("file_version_assets", "file_version_assets.file_version_id", "file_versions.id")
      .whereNull("file_items.deleted_at")
      .sum<{ size: string }>("file_version_assets.size as size")
      .first();

    // Space held by soft-deleted assets — what emptying the trash would free.
    const trashedBytesRow = await db("file_version_assets")
      .whereNotNull("deleted_at")
      .sum<{ size: string }>("size as size")
      .first();

    const byTypeRows = (await db("file_version_assets")
      .select(
        db.raw("lower(coalesce(nullif(substring(original_name from '\\.([^\\.]+)$'), ''), 'other')) as ext"),
        db.raw("count(id) as count"),
        db.raw("coalesce(sum(size), 0) as size")
      )
      .groupBy("ext")
      .orderByRaw("coalesce(sum(size), 0) desc")
      .limit(8)) as any[];

    const disk = await this.getDiskUsage();
    const quotaGb = Number(this.config.get<string>("STORAGE_QUOTA_GB", "") || 0);
    const quotaBytes = Number.isFinite(quotaGb) && quotaGb > 0 ? quotaGb * 1024 * 1024 * 1024 : null;

    return {
      totalBytes: Number(totalBytesRow?.size || 0),
      currentBytes: Number(currentBytesRow?.size || 0),
      trashedBytes: Number(trashedBytesRow?.size || 0),
      assetCount: Number(assetCountRow?.count || 0),
      fileCount: Number(fileCountRow?.count || 0),
      quotaBytes,
      diskTotalBytes: disk?.diskTotalBytes ?? null,
      diskFreeBytes: disk?.diskFreeBytes ?? null,
      byType: byTypeRows.map((row: any) => ({
        ext: row.ext || "other",
        count: Number(row.count || 0),
        bytes: Number(row.size || 0)
      }))
    };
  }

  async largestFiles(params: { limit?: number }, preferredLang: string | null) {
    const db = this.dbService.db;
    const lang = normalizeLang(preferredLang) || this.getDefaultLang();
    const defaultLang = this.getDefaultLang();
    const limit = Math.min(50, Math.max(1, Number(params.limit || 10)));

    const rows = await db("file_items")
      .leftJoin("file_versions", "file_versions.file_item_id", "file_items.id")
      .leftJoin("file_version_assets", "file_version_assets.file_version_id", "file_versions.id")
      .leftJoin({ ft_pref: "file_translations" }, this.titleJoin("ft_pref", "file_items.id", lang))
      .leftJoin({ ft_def: "file_translations" }, this.titleJoin("ft_def", "file_items.id", defaultLang))
      .whereNull("file_items.deleted_at")
      .whereNull("file_version_assets.deleted_at")
      .groupBy("file_items.id", "ft_pref.title", "ft_def.title")
      .select(
        "file_items.id as file_item_id",
        db.raw("coalesce(??, ??) as title", ["ft_pref.title", "ft_def.title"]),
        db.raw("coalesce(sum(file_version_assets.size), 0) as bytes"),
        db.raw("count(distinct file_versions.id) as version_count")
      )
      .orderByRaw("coalesce(sum(file_version_assets.size), 0) desc")
      .limit(limit);

    return {
      data: rows.map((row: any) => ({
        fileItemId: row.file_item_id,
        title: row.title || null,
        bytes: Number(row.bytes || 0),
        versionCount: Number(row.version_count || 0)
      }))
    };
  }

  // Failed logins and lockouts, so the dashboard shows attacks as well as usage.
  async loginActivity(params: { from?: string; to?: string; limit?: number }) {
    const db = this.dbService.db;
    const range = { from: params.from, to: params.to };
    const limit = Math.min(100, Math.max(1, Number(params.limit || 20)));

    const totalsQuery = db("login_attempts").select(
      db.raw("count(*) filter (where success) as success_count"),
      db.raw("count(*) filter (where not success) as failure_count"),
      db.raw("count(distinct ip) filter (where not success) as failure_ips")
    );
    this.applyRange(totalsQuery, "created_at", range);
    const totals = await totalsQuery.first();

    const recentQuery = db("login_attempts")
      .leftJoin("users", "users.id", "login_attempts.user_id")
      .where("login_attempts.success", false)
      .select(
        "login_attempts.id",
        "login_attempts.login",
        "login_attempts.reason",
        "login_attempts.ip",
        "login_attempts.user_agent",
        "login_attempts.created_at",
        "users.id as user_id",
        "users.surname as user_surname",
        "users.name as user_name",
        "users.patronymic as user_patronymic"
      )
      .orderBy("login_attempts.created_at", "desc")
      .limit(limit);
    this.applyRange(recentQuery, "login_attempts.created_at", range);
    const recent = await recentQuery;

    return {
      successCount: Number((totals as any)?.success_count || 0),
      failureCount: Number((totals as any)?.failure_count || 0),
      failureIps: Number((totals as any)?.failure_ips || 0),
      recentFailures: recent.map((row: any) => ({
        id: row.id,
        login: row.login,
        reason: row.reason || null,
        ip: row.ip || null,
        userAgent: row.user_agent || null,
        createdAt: row.created_at,
        userId: row.user_id || null,
        fullName:
          [row.user_surname, row.user_name, row.user_patronymic].filter(Boolean).join(" ").trim() || null
      }))
    };
  }
}
