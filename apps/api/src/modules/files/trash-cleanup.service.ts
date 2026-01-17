import { Injectable } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { ConfigService } from "@nestjs/config";
import { DatabaseService } from "../../db/database.service";
import { FilesService } from "./files.service";

@Injectable()
export class TrashCleanupService {
  constructor(
    private readonly config: ConfigService,
    private readonly dbService: DatabaseService,
    private readonly filesService: FilesService
  ) {}

  @Cron("0 3 * * *")
  async cleanup() {
    const ttl = Number(this.config.get<string>("TRASH_TTL_DAYS", "30"));
    const cutoff = new Date(Date.now() - ttl * 24 * 60 * 60 * 1000).toISOString();

    const items = await this.dbService.db("file_items")
      .whereNotNull("deleted_at")
      .andWhere("deleted_at", "<=", cutoff)
      .select("id");

    for (const item of items) {
      await this.filesService.forceDelete(item.id);
    }
  }
}
