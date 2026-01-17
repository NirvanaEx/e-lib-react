import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import knex, { Knex } from "knex";

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  public readonly db: Knex;

  constructor(private readonly config: ConfigService) {
    this.db = knex({
      client: "pg",
      connection: {
        host: this.config.get<string>("DB_HOST", "localhost"),
        port: Number(this.config.get<string>("DB_PORT", "5432")),
        user: this.config.get<string>("DB_USER", "elib"),
        password: this.config.get<string>("DB_PASSWORD", "elib"),
        database: this.config.get<string>("DB_NAME", "elib")
      }
    });
  }

  async onModuleDestroy() {
    await this.db.destroy();
  }
}
