import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Roles } from "../../common/decorators/roles.decorator";
import { Access } from "../../common/decorators/access.decorator";
import { RolesService } from "./roles.service";
import { UpdateRolePermissionsDto } from "./dto/update-role-permissions.dto";
import { CreateRoleDto } from "./dto/create-role.dto";

@ApiTags("dashboard/roles")
@ApiBearerAuth()
@Roles("superadmin", "admin")
@Access("dashboard.access")
@Controller("dashboard/roles")
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @Access("role.read")
  async list() {
    return this.rolesService.list();
  }

  @Post()
  @Access("role.add")
  async create(@Body() body: CreateRoleDto) {
    return this.rolesService.create(body.name);
  }

  @Get("permissions")
  @Access("role.read")
  async listPermissions() {
    return this.rolesService.listPermissions();
  }

  @Get(":id/permissions")
  @Access("role.read")
  async getRolePermissions(@Param("id", ParseIntPipe) id: number) {
    return this.rolesService.getRolePermissions(id);
  }

  @Patch(":id/permissions")
  @Access("role.update")
  async updateRolePermissions(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateRolePermissionsDto
  ) {
    return this.rolesService.updateRolePermissions(id, body.permissions);
  }
}
