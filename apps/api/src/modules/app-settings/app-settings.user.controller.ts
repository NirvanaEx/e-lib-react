import { Controller, Get } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Roles } from "../../common/decorators/roles.decorator";
import { AppSettingsService } from "./app-settings.service";

@ApiTags("user/app-settings")
@ApiBearerAuth()
@Roles("superadmin", "admin", "manager", "user")
@Controller("user/app-settings")
export class AppSettingsUserController {
  constructor(private readonly appSettingsService: AppSettingsService) {}

  @Get()
  async getSettings() {
    return this.appSettingsService.getPublicSettings();
  }
}
