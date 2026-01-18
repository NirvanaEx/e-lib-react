import { Controller, Get, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Roles } from "../../common/decorators/roles.decorator";
import { User } from "../../common/decorators/user.decorator";
import { Lang } from "../../common/decorators/lang.decorator";
import { ContentPagesService } from "./content-pages.service";

@ApiTags("user/content-pages")
@ApiBearerAuth()
@Roles("superadmin", "admin", "manager", "user")
@Controller("user/content-pages")
export class ContentPagesUserController {
  constructor(private readonly contentPagesService: ContentPagesService) {}

  @Get(":key")
  async getOne(@Param("key") key: string, @User() user: any, @Lang() lang: string | null) {
    return this.contentPagesService.getUserPage(key, user.id, lang);
  }

  @Post(":key/accept")
  async accept(@Param("key") key: string, @User() user: any) {
    return this.contentPagesService.acceptPage(key, user.id);
  }
}
