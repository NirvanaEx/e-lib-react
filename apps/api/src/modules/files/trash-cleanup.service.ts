import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { ConfigService } from "@nestjs/config";
import { DatabaseService } from "../../db/database.service";
import { FilesService } from "./files.service";

const DEFAULT_TTL_DAYS = 30;

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
    // Испорченный TRASH_TTL_DAYS не должен ни ронять задачу (Invalid Date в
    // toISOString), ни обнулять срок хранения корзины.
    const raw = Number(this.config.get<string>("TRASH_TTL_DAYS", String(DEFAULT_TTL_DAYS)));
    const ttl = Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_TTL_DAYS;
    const cutoff = new Date(Date.now() - ttl * 24 * 60 * 60 * 1000).toISOString();

    const items = await this.dbService.db("file_items")
      .whereNotNull("deleted_at")
      .whereNull("purged_at")
      .andWhere("deleted_at", "<=", cutoff)
      .select("id");

    for (const item of items) {
      // Один проблемный документ не должен оставлять остальные в корзине
      // навсегда: ошибку пишем в лог и идём дальше.
      try {
        await this.filesService.forceDelete(item.id);
      } catch (error) {
        this.logger.error(`Trash cleanup failed for file item ${item.id}`, error as Error);
      }
    }
  }
}
