import { Controller, Get, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Roles } from "../../common/decorators/roles.decorator";
import { SessionsService } from "./sessions.service";
import { SessionsQueryDto } from "./dto/sessions-query.dto";

@ApiTags("admin/sessions")
@ApiBearerAuth()
@Roles("superadmin", "admin")
@Controller("admin/sessions")
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get()
  async list(@Query() query: SessionsQueryDto) {
    return this.sessionsService.list({
      page: query.page || 1,
      pageSize: query.pageSize || 20,
      userId: query.userId
    });
  }
}
