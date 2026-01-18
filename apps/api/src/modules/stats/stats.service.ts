import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DatabaseService } from "../../db/database.service";
import { normalizeLang } from "../../common/utils/lang";

@Injectable()
export class StatsService {
  constructor(private readonly dbService: DatabaseService, private readonly config: ConfigService) {}

  private getDefaultLang() {
    return normalizeLang(this.config.get<string>("DEFAULT_DATA_LANG", "ru")) || "ru";
  }

  async topFiles(params: { from?: string; to?: string }) {
    const lang = this.getDefaultLang();
    const db = this.dbService.db;
    const query = db("downloads")
      .leftJoin("file_translations", function () {
        this.on("file_translations.file_item_id", "=", "downloads.file_item_id").andOn(
          "file_translations.lang",
          "=",
          db.raw("?", [lang])
        );
      })
      .select(
        "downloads.file_item_id",
        "file_translations.title"
      )
      .count<{ count: string }>("downloads.id as count")
      .groupBy("downloads.file_item_id", "file_translations.title")
      .orderBy("count", "desc")
      .limit(10);

    if (params.from) query.where("downloads.created_at", ">=", params.from);
    if (params.to) query.where("downloads.created_at", "<=", params.to);

    const data = await query;
    return { data };
  }

  async userDownloads(params: { userId: number; from?: string; to?: string }) {
    const lang = this.getDefaultLang();
    const db = this.dbService.db;
    const query = db("downloads")
      .leftJoin("file_translations", function () {
        this.on("file_translations.file_item_id", "=", "downloads.file_item_id").andOn(
          "file_translations.lang",
          "=",
          db.raw("?", [lang])
        );
      })
      .select("downloads.id", "downloads.file_item_id", "downloads.created_at", "file_translations.title")
      .where("downloads.user_id", params.userId)
      .orderBy("downloads.created_at", "desc");

    if (params.from) query.where("downloads.created_at", ">=", params.from);
    if (params.to) query.where("downloads.created_at", "<=", params.to);

    const data = await query;
    return { data };
  }

  async downloadsByPeriod(params: { from?: string; to?: string; bucket?: string }) {
    const bucket = params.bucket === "month" || params.bucket === "week" ? params.bucket : "day";
    const db = this.dbService.db;
    const query = db("downloads")
      .select(db.raw(`date_trunc('${bucket}', created_at) as bucket`))
      .count<{ count: string }>("id as count")
      .groupBy("bucket")
      .orderBy("bucket", "asc");

    if (params.from) query.where("created_at", ">=", params.from);
    if (params.to) query.where("created_at", "<=", params.to);

    const data = await query;
    return { data };
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

    return {
      totalBytes: Number(totalBytesRow?.size || 0),
      currentBytes: Number(currentBytesRow?.size || 0),
      assetCount: Number(assetCountRow?.count || 0),
      fileCount: Number(fileCountRow?.count || 0)
    };
  }
}
