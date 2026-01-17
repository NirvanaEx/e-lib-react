import { Controller, Get, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Roles } from "../../common/decorators/roles.decorator";
import { AuditService } from "./audit.service";
import { AuditQueryDto } from "./dto/audit-query.dto";

@ApiTags("audit")
@ApiBearerAuth()
@Roles("superadmin", "admin", "manager")
@Controller(["admin/audit", "manage/audit"])
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  async list(@Query() query: AuditQueryDto) {
    return this.auditService.list({
      page: query.page || 1,
      pageSize: query.pageSize || 20,
      actorId: query.actorId,
      action: query.action,
      entityType: query.entityType,
      from: query.from,
      to: query.to
    });
  }
}
