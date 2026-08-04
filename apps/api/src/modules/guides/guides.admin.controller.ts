import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UploadedFile,
  UseInterceptors
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Access } from "../../common/decorators/access.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { UpdateGuideDto, UpdateGuideSettingsDto } from "./dto/update-guide.dto";
import { guideImageUploadOptions } from "./guide-image-upload";
import { GuidesService } from "./guides.service";

@ApiTags("dashboard/guides")
@ApiBearerAuth()
@Roles("superadmin", "admin")
@Access("dashboard.access")
@Controller("dashboard/guides")
export class GuidesAdminController {
  constructor(private readonly guidesService: GuidesService) {}

  @Get(":key")
  @Access("content.read")
  async getOne(@Param("key") key: string) {
    return this.guidesService.getGuideForEdit(key);
  }

  @Put(":key")
  @Access("content.update")
  async update(@Param("key") key: string, @Body() body: UpdateGuideDto) {
    return this.guidesService.updateGuide(key, { blocks: body.blocks, isActive: body.isActive });
  }

  // Отдельно от сохранения текста: выключатель не должен требовать,
  // чтобы администратор сначала сохранил все блоки.
  @Patch(":key/settings")
  @Access("content.update")
  async setActive(@Param("key") key: string, @Body() body: UpdateGuideSettingsDto) {
    return this.guidesService.setActive(key, body.isActive);
  }

  @Post(":key/reset")
  @Access("content.update")
  async reset(@Param("key") key: string) {
    return this.guidesService.resetGuide(key);
  }

  @UseInterceptors(FileInterceptor("file", guideImageUploadOptions))
  @Post(":key/image")
  @Access("content.update")
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException("File is required");
    return this.guidesService.saveImage(file);
  }
}
