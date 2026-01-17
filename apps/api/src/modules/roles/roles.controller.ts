import { Controller, Get } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Roles } from "../../common/decorators/roles.decorator";
import { RolesService } from "./roles.service";

@ApiTags("admin/roles")
@ApiBearerAuth()
@Roles("superadmin", "admin")
@Controller("admin/roles")
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  async list() {
    return this.rolesService.list();
  }
}
