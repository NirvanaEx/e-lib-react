import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Roles } from "../../common/decorators/roles.decorator";
import { User } from "../../common/decorators/user.decorator";
import { DepartmentsService } from "./departments.service";
import { CreateDepartmentDto } from "./dto/create-department.dto";
import { UpdateDepartmentDto } from "./dto/update-department.dto";
import { DepartmentsQueryDto } from "./dto/departments-query.dto";

@ApiTags("admin/departments")
@ApiBearerAuth()
@Roles("superadmin", "admin")
@Controller("admin/departments")
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get()
  async list(@Query() query: DepartmentsQueryDto) {
    return this.departmentsService.list({
      page: query.page || 1,
      pageSize: query.pageSize || 20,
      q: query.q
    });
  }

  @Post()
  async create(@Body() body: CreateDepartmentDto, @User() actor: any) {
    return this.departmentsService.create(body, actor.id);
  }

  @Patch(":id")
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateDepartmentDto,
    @User() actor: any
  ) {
    return this.departmentsService.update(id, body, actor.id);
  }

  @Delete(":id")
  async remove(@Param("id", ParseIntPipe) id: number, @User() actor: any) {
    return this.departmentsService.remove(id, actor.id);
  }
}
