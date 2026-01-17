import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Roles } from "../../common/decorators/roles.decorator";
import { User } from "../../common/decorators/user.decorator";
import { Lang } from "../../common/decorators/lang.decorator";
import { CategoriesService } from "./categories.service";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";
import { CategoriesQueryDto } from "./dto/categories-query.dto";

@ApiTags("manage/categories")
@ApiBearerAuth()
@Roles("superadmin", "admin", "manager")
@Controller("manage/categories")
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  async list(@Query() query: CategoriesQueryDto, @Lang() lang: string | null) {
    return this.categoriesService.list(
      { page: query.page || 1, pageSize: query.pageSize || 20, q: query.q },
      lang
    );
  }

  @Get(":id")
  async getOne(@Param("id", ParseIntPipe) id: number, @Lang() lang: string | null) {
    return this.categoriesService.getOne(id, lang);
  }

  @Post()
  async create(@Body() body: CreateCategoryDto, @User() actor: any) {
    return this.categoriesService.create(body, actor.id);
  }

  @Patch(":id")
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateCategoryDto,
    @User() actor: any
  ) {
    return this.categoriesService.update(id, body, actor.id);
  }

  @Delete(":id")
  async remove(@Param("id", ParseIntPipe) id: number, @User() actor: any) {
    return this.categoriesService.remove(id, actor.id);
  }
}
