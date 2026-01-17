import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Roles } from "../../common/decorators/roles.decorator";
import { Access } from "../../common/decorators/access.decorator";
import { User } from "../../common/decorators/user.decorator";
import { DepartmentsService } from "./departments.service";
import { CreateDepartmentDto } from "./dto/create-department.dto";
import { UpdateDepartmentDto } from "./dto/update-department.dto";
import { DepartmentsQueryDto } from "./dto/departments-query.dto";

@ApiTags("dashboard/departments")
@ApiBearerAuth()
@Roles("superadmin", "admin")
@Access("dashboard.access")
@Controller("dashboard/departments")
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get("options")
  @Access("file.access.update")
  @Roles("superadmin", "admin", "manager")
  async options(@Query() query: DepartmentsQueryDto) {
    return this.departmentsService.listOptions({
      page: query.page || 1,
      pageSize: query.pageSize || 20,
      q: query.q
    });
  }

  @Get()
  @Access("department.read")
  async list(@Query() query: DepartmentsQueryDto) {
    return this.departmentsService.list({
      page: query.page || 1,
      pageSize: query.pageSize || 20,
      q: query.q
    });
  }

  @Post()
  @Access("department.add")
  async create(@Body() body: CreateDepartmentDto, @User() actor: any) {
    return this.departmentsService.create(body, actor.id);
  }

  @Patch(":id")
  @Access("department.update")
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateDepartmentDto,
    @User() actor: any
  ) {
    return this.departmentsService.update(id, body, actor.id);
  }

  @Delete(":id")
  @Access("department.delete")
  async remove(@Param("id", ParseIntPipe) id: number, @User() actor: any) {
    return this.departmentsService.remove(id, actor.id);
  }
}
