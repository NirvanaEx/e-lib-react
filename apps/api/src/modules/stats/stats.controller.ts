import { Controller, Get, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Roles } from "../../common/decorators/roles.decorator";
import { StatsService } from "./stats.service";
import { TopFilesQueryDto } from "./dto/top-files-query.dto";
import { UserDownloadsQueryDto } from "./dto/user-downloads-query.dto";
import { DownloadsByPeriodQueryDto } from "./dto/downloads-by-period-query.dto";

@ApiTags("manage/stats")
@ApiBearerAuth()
@Roles("superadmin", "admin", "manager")
@Controller("manage/stats")
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get("top-files")
  async topFiles(@Query() query: TopFilesQueryDto) {
    return this.statsService.topFiles({ from: query.from, to: query.to });
  }

  @Get("user-downloads")
  async userDownloads(@Query() query: UserDownloadsQueryDto) {
    return this.statsService.userDownloads({ userId: query.userId, from: query.from, to: query.to });
  }

  @Get("downloads-by-period")
  async downloadsByPeriod(@Query() query: DownloadsByPeriodQueryDto) {
    return this.statsService.downloadsByPeriod({ from: query.from, to: query.to, bucket: query.bucket });
  }
}
