import { Controller, Get, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Roles } from "../../common/decorators/roles.decorator";
import { Access } from "../../common/decorators/access.decorator";
import { User } from "../../common/decorators/user.decorator";
import { SeedService } from "./seed.service";

@ApiTags("dashboard/seed")
@ApiBearerAuth()
@Roles("superadmin", "admin")
@Access("dashboard.access")
@Controller("dashboard/seed")
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @Get("status")
  @Access("section.read")
  async status() {
    return this.seedService.getStatus();
  }

  @Post("sections")
  @Access("section.add")
  async seedSections(@User() actor: any) {
    const { sections } = await this.seedService.seedSections(actor.id);
    return { sections };
  }

  @Post("demo")
  @Access("section.add")
  async seedDemo(@User() actor: any) {
    return this.seedService.seedDemo(actor.id);
  }
}
