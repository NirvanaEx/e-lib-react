import { BadRequestException, Body, Controller, Get, Post, Put, UploadedFile, UseInterceptors } from "@nestjs/common";
import { ApiBearerAuth, ApiConsumes, ApiTags } from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import { Access } from "../../common/decorators/access.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { AppSettingsService } from "./app-settings.service";
import { UpdateAppSettingsDto } from "./dto/update-app-settings.dto";
import { brandingUploadOptions } from "./branding-upload";

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

  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("file", brandingUploadOptions))
  @Post("branding/image")
  @Access("content.update")
  async uploadBrandingImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException("File is required");
    }
    return this.appSettingsService.saveBrandingImage(file);
  }
}
