import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../../db/database.service";

const TEST_RIBBON_KEY = "test_ribbon_enabled";

export type PublicSettings = {
  testRibbonEnabled: boolean;
};

@Injectable()
export class AppSettingsService {
  constructor(private readonly dbService: DatabaseService) {}

  private async getValue(key: string): Promise<string | null> {
    const row = await this.dbService.db("app_settings").where({ key }).first();
    return row?.value ?? null;
  }

  private async setValue(key: string, value: string): Promise<void> {
    const existing = await this.dbService.db("app_settings").where({ key }).first();
    if (existing) {
      await this.dbService
        .db("app_settings")
        .where({ key })
        .update({ value, updated_at: this.dbService.db.fn.now() });
    } else {
      await this.dbService.db("app_settings").insert({
        key,
        value,
        created_at: this.dbService.db.fn.now(),
        updated_at: this.dbService.db.fn.now()
      });
    }
  }

  async getPublicSettings(): Promise<PublicSettings> {
    const testRibbon = await this.getValue(TEST_RIBBON_KEY);
    return {
      // Default to enabled when the setting has never been stored.
      testRibbonEnabled: testRibbon === null ? true : testRibbon === "true"
    };
  }

  async updateSettings(dto: { testRibbonEnabled?: boolean }): Promise<PublicSettings> {
    if (dto.testRibbonEnabled !== undefined) {
      await this.setValue(TEST_RIBBON_KEY, dto.testRibbonEnabled ? "true" : "false");
    }
    return this.getPublicSettings();
  }
}
