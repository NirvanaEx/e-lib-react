import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../../db/database.service";
import { getRequestContextValue } from "../../common/request-context";

@Injectable()
export class DownloadsService {
  constructor(private readonly dbService: DatabaseService) {}

  async log(params: {
    userId: number;
    fileItemId: number;
    fileVersionId: number;
    fileVersionAssetId: number;
    lang: string;
  }) {
    await this.dbService.db("downloads").insert({
      user_id: params.userId,
      file_item_id: params.fileItemId,
      file_version_id: params.fileVersionId,
      file_version_asset_id: params.fileVersionAssetId,
      lang: params.lang,
      // Same request metadata the audit log records, so statistics can answer
      // "who, from where, when".
      ip: getRequestContextValue<string>("ip") || null,
      user_agent: (getRequestContextValue<string>("userAgent") || "").slice(0, 255) || null,
      created_at: this.dbService.db.fn.now()
    });
  }
}
