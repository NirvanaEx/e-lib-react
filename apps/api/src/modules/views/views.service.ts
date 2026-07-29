import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../../db/database.service";
import { getRequestContextValue } from "../../common/request-context";

// Opening the same file card twice in a row is one visit, not two. Without a
// window every refresh would inflate the numbers on the statistics page.
const DEDUPE_WINDOW_MINUTES = 15;

@Injectable()
export class ViewsService {
  constructor(private readonly dbService: DatabaseService) {}

  async log(params: {
    userId: number;
    fileItemId: number;
    fileVersionId: number | null;
    lang: string | null;
    source?: "details" | "viewer";
  }) {
    try {
      const since = new Date(Date.now() - DEDUPE_WINDOW_MINUTES * 60 * 1000);
      const recent = await this.dbService.db("file_views")
        .where({ user_id: params.userId, file_item_id: params.fileItemId })
        .where("created_at", ">=", since)
        .first();
      if (recent) return;

      await this.dbService.db("file_views").insert({
        user_id: params.userId,
        file_item_id: params.fileItemId,
        file_version_id: params.fileVersionId,
        lang: params.lang,
        source: params.source || "details",
        ip: getRequestContextValue<string>("ip") || null,
        user_agent: (getRequestContextValue<string>("userAgent") || "").slice(0, 255) || null,
        created_at: this.dbService.db.fn.now()
      });
    } catch (_err) {
      // Statistics must never break reading a file.
      return;
    }
  }
}
