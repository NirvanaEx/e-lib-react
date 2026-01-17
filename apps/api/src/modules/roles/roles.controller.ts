import { Controller, Get } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Roles } from "../../common/decorators/roles.decorator";
import { Access } from "../../common/decorators/access.decorator";
import { RolesService } from "./roles.service";

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
}
