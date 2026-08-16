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
    // Всё тело обёрнуто: у задачи по расписанию нет вызывающего, и любое
    // необработанное исключение здесь — это не сбой одной уборки, а
    // unhandledRejection, то есть падение всего API в три часа ночи.
    try {
      await this.runCleanup();
    } catch (error) {
      this.logger.error(
        `Trash cleanup failed: ${(error as Error)?.message}`,
        (error as Error)?.stack
      );
    }
  }

  private async runCleanup() {
    const ttl = Number(this.config.get<string>("TRASH_TTL_DAYS", String(DEFAULT_TTL_DAYS)));
    // Пустой или нечисловой TRASH_TTL_DAYS давал NaN, а NaN-дата роняет
    // toISOString(). Ноль опаснее молча: корзина вычищалась бы сразу же.
    const ttlDays = Number.isFinite(ttl) && ttl > 0 ? ttl : DEFAULT_TTL_DAYS;
    const cutoff = new Date(Date.now() - ttlDays * 24 * 60 * 60 * 1000).toISOString();

    const items = await this.dbService.db("file_items")
      .whereNotNull("deleted_at")
      .whereNull("purged_at")
      .andWhere("deleted_at", "<=", cutoff)
      .select("id");

    for (const item of items) {
      // Элемент могли восстановить между выборкой и удалением — тогда
      // forceDelete кидает NotFound. Один такой элемент не должен обрывать
      // уборку остальных.
      try {
        await this.filesService.forceDelete(item.id);
      } catch (error) {
        this.logger.warn(`Trash cleanup skipped file ${item.id}: ${(error as Error)?.message}`);
      }
    }
  }
}
