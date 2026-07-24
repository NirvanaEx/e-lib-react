import { Module } from "@nestjs/common";
import { UsersService } from "./users.service";
import { UsersController } from "./users.controller";
import { UsersSettingsController } from "./users.settings.controller";
import { UsersAvatarController } from "./users.avatar.controller";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [AuditModule],
  providers: [UsersService],
  controllers: [UsersController, UsersSettingsController, UsersAvatarController]
})
export class UsersModule {}
