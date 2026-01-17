import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../../db/database.service";

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
      created_at: this.dbService.db.fn.now()
    });
  }
}
