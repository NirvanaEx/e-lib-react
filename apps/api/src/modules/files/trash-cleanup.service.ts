import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { ConfigService } from "@nestjs/config";
import { DatabaseService } from "../../db/database.service";
import { FilesService } from "./files.service";

const DEFAULT_TRASH_TTL_DAYS = 30;

@Injectable()
export class TrashCleanupService {
  private readonly logger = new Logger(TrashCleanupService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly dbService: DatabaseService,
    private readonly filesService: FilesService
  ) {}

  @Cron("0 3 * * *")
  async cleanup() {
    // Nothing awaits this handler: a rejection here is an unhandled rejection
    // and takes the whole API process down, so everything below is guarded.
    try {
      const rawTtl = Number(this.config.get<string>("TRASH_TTL_DAYS", String(DEFAULT_TRASH_TTL_DAYS)));
      // An unset or malformed TRASH_TTL_DAYS used to become 0 or NaN: 0 purged
      // the whole trash on the next run, NaN made `new Date(NaN).toISOString()`
      // throw. Both fall back to the documented default instead.
      const ttl = Number.isFinite(rawTtl) && rawTtl > 0 ? rawTtl : DEFAULT_TRASH_TTL_DAYS;
      const cutoff = new Date(Date.now() - ttl * 24 * 60 * 60 * 1000).toISOString();

      const items = await this.dbService.db("file_items")
        .whereNotNull("deleted_at")
        .whereNull("purged_at")
        .andWhere("deleted_at", "<=", cutoff)
        .select("id");

      for (const item of items) {
        // One item that changed state since the SELECT (restored, already
        // purged) must not abort the sweep for the rest.
        try {
          await this.filesService.forceDelete(item.id);
        } catch (err) {
          this.logger.warn(`Trash cleanup skipped file ${item.id}: ${(err as Error)?.message}`);
        }
      }
    } catch (err) {
      this.logger.error(`Trash cleanup failed: ${(err as Error)?.message}`);
    }
  }
}
