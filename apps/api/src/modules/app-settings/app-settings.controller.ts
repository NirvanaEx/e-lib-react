import { Body, Controller, Get, Put } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Access } from "../../common/decorators/access.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { AppSettingsService } from "./app-settings.service";
import { UpdateAppSettingsDto } from "./dto/update-app-settings.dto";

@ApiTags("dashboard/settings")
@ApiBearerAuth()
@Roles("superadmin", "admin")
@Access("dashboard.access")
@Controller("dashboard/settings")
export class AppSettingsController {
  constructor(private readonly appSettingsService: AppSettingsService) {}

  @Get()
  @Access("content.read")
  async getSettings() {
    return this.appSettingsService.getPublicSettings();
  }

  @Put()
  @Access("content.update")
  async update(@Body() body: UpdateAppSettingsDto) {
    return this.appSettingsService.updateSettings(body);
  }
}
