import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { ConfigService } from "@nestjs/config";
import { DatabaseService } from "../../db/database.service";
import { FilesService } from "./files.service";

const DEFAULT_TTL_DAYS = 30;

@Injectable()
export class TrashCleanupService {
  constructor(
    private readonly config: ConfigService,
    private readonly dbService: DatabaseService,
    private readonly filesService: FilesService
  ) {}

  private readonly logger = new Logger(TrashCleanupService.name);

  @Cron("0 3 * * *")
  async cleanup() {
    // Пустой или нечисловой TRASH_TTL_DAYS давал NaN: дата получалась Invalid
    // Date, toISOString() бросал RangeError прямо в планировщике, а нулевой TTL
    // вычистил бы корзину целиком в ту же ночь.
    const raw = Number(this.config.get<string>("TRASH_TTL_DAYS", String(DEFAULT_TTL_DAYS)));
    const ttl = Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_TTL_DAYS;
    const cutoff = new Date(Date.now() - ttl * 24 * 60 * 60 * 1000).toISOString();

    const items = await this.dbService.db("file_items")
      .whereNotNull("deleted_at")
      .whereNull("purged_at")
      .andWhere("deleted_at", "<=", cutoff)
      .select("id");

    for (const item of items) {
      // Один сбойный файл не должен останавливать всю уборку и ронять задание
      // необработанным отказом.
      try {
        await this.filesService.forceDelete(item.id);
      } catch (error) {
        this.logger.error(`Failed to purge trashed file ${item.id}`, error as Error);
      }
    }
  }
}
