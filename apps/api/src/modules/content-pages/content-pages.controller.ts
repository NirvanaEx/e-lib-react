import { Body, Controller, Get, Param, Put } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Access } from "../../common/decorators/access.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { ContentPagesService } from "./content-pages.service";
import { UpdateContentPageDto } from "./dto/update-content-page.dto";

@ApiTags("dashboard/content-pages")
@ApiBearerAuth()
@Roles("superadmin", "admin")
@Access("dashboard.access")
@Controller("dashboard/content-pages")
export class ContentPagesController {
  constructor(private readonly contentPagesService: ContentPagesService) {}

  @Get(":key")
  @Access("content.read")
  async getOne(@Param("key") key: string) {
    return this.contentPagesService.getAdminPage(key);
  }

  @Put(":key")
  @Access("content.update")
  async update(@Param("key") key: string, @Body() body: UpdateContentPageDto) {
    return this.contentPagesService.updatePage(key, {
      translations: body.translations,
      displayMode: body.displayMode,
      isActive: body.isActive,
      requiresAcceptance: body.requiresAcceptance
    });
  }
}
