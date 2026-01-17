import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Roles } from "../../common/decorators/roles.decorator";
import { User } from "../../common/decorators/user.decorator";
import { Lang } from "../../common/decorators/lang.decorator";
import { SectionsService } from "./sections.service";
import { CreateSectionDto } from "./dto/create-section.dto";
import { UpdateSectionDto } from "./dto/update-section.dto";
import { SectionsQueryDto } from "./dto/sections-query.dto";

@ApiTags("manage/sections")
@ApiBearerAuth()
@Roles("superadmin", "admin", "manager")
@Controller("manage/sections")
export class SectionsController {
  constructor(private readonly sectionsService: SectionsService) {}

  @Get()
  async list(@Query() query: SectionsQueryDto, @Lang() lang: string | null) {
    return this.sectionsService.list(
      { page: query.page || 1, pageSize: query.pageSize || 20, q: query.q },
      lang
    );
  }

  @Get(":id")
  async getOne(@Param("id", ParseIntPipe) id: number, @Lang() lang: string | null) {
    return this.sectionsService.getOne(id, lang);
  }

  @Post()
  async create(@Body() body: CreateSectionDto, @User() actor: any) {
    return this.sectionsService.create(body, actor.id);
  }

  @Patch(":id")
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateSectionDto,
    @User() actor: any
  ) {
    return this.sectionsService.update(id, body, actor.id);
  }

  @Delete(":id")
  async remove(@Param("id", ParseIntPipe) id: number, @User() actor: any) {
    return this.sectionsService.remove(id, actor.id);
  }
}
