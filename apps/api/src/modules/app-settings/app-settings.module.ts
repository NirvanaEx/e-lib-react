import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../db/database.module";
import { AppSettingsController } from "./app-settings.controller";
import { AppSettingsUserController } from "./app-settings.user.controller";
import { AppSettingsService } from "./app-settings.service";

@Module({
  imports: [DatabaseModule],
  controllers: [AppSettingsController, AppSettingsUserController],
  providers: [AppSettingsService],
  exports: [AppSettingsService]
})
export class AppSettingsModule {}
