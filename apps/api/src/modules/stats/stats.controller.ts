import { Controller, Get, Param, ParseIntPipe, Query, Res } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { Roles } from "../../common/decorators/roles.decorator";
import { Access } from "../../common/decorators/access.decorator";
import { Lang } from "../../common/decorators/lang.decorator";
import { StatsService } from "./stats.service";
import { ActivityQueryDto } from "./dto/activity-query.dto";
import { PeriodQueryDto, StatsRangeQueryDto, TopQueryDto } from "./dto/stats-range-query.dto";

const EXPORT_ROW_LIMIT = 5000;

function toCsvCell(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  // Neutralise spreadsheet formula injection in exported cells.
  const guarded = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${guarded.replace(/"/g, '""')}"`;
}

@ApiTags("dashboard/stats")
@ApiBearerAuth()
@Roles("superadmin", "admin", "manager")
@Access("dashboard.access")
@Controller("dashboard/stats")
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get("overview")
  @Access("stats.read")
  async overview(@Query() query: StatsRangeQueryDto) {
    return this.statsService.overview({ from: query.from, to: query.to });
  }

  @Get("activity")
  @Access("stats.read")
  async activity(@Query() query: ActivityQueryDto, @Lang() lang: string | null) {
    return this.statsService.activity(
      {
        page: query.page || 1,
        pageSize: Math.min(100, query.pageSize || 20),
        from: query.from,
        to: query.to,
        userId: query.userId,
        fileItemId: query.fileItemId,
        departmentId: query.departmentId,
        action: query.action,
        q: query.q,
        sortDir: query.sortDir
      },
      lang
    );
  }

  @Get("activity/export")
  @Access("stats.read")
  async exportActivity(@Query() query: ActivityQueryDto, @Lang() lang: string | null, @Res() res: Response) {
    // Exports what the current filter selects, not just the visible page — an
    // audit trail is only useful whole.
    const { data } = await this.statsService.activity(
      {
        page: 1,
        pageSize: EXPORT_ROW_LIMIT,
        from: query.from,
        to: query.to,
        userId: query.userId,
        fileItemId: query.fileItemId,
        departmentId: query.departmentId,
        action: query.action,
        q: query.q,
        sortDir: query.sortDir
      },
      lang
    );

    const header = [
      "datetime",
      "action",
      "user_login",
      "user_name",
      "department",
      "file_id",
      "file_title",
      "version",
      "lang",
      "ip",
      "user_agent"
    ];
    const rows = data.map((row) => [
      row.createdAt ? new Date(row.createdAt).toISOString() : "",
      row.action,
      row.user?.login || "",
      row.user?.fullName || "",
      row.user?.department || "",
      row.file?.id ?? "",
      row.file?.title || "",
      row.versionNumber ?? "",
      row.lang || "",
      row.ip || "",
      row.userAgent || ""
    ]);

    const csv = [header, ...rows].map((line) => line.map(toCsvCell).join(";")).join("\r\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="activity.csv"');
    // BOM so Excel reads the Cyrillic titles as UTF-8.
    return res.send(`﻿${csv}`);
  }

  @Get("top-files")
  @Access("stats.read")
  async topFiles(@Query() query: TopQueryDto, @Lang() lang: string | null) {
    return this.statsService.topFiles({ from: query.from, to: query.to, limit: query.limit }, lang);
  }

  @Get("top-users")
  @Access("stats.read")
  async topUsers(@Query() query: TopQueryDto) {
    return this.statsService.topUsers({ from: query.from, to: query.to, limit: query.limit });
  }

  @Get("by-department")
  @Access("stats.read")
  async byDepartment(@Query() query: StatsRangeQueryDto) {
    return this.statsService.byDepartment({ from: query.from, to: query.to });
  }

  @Get("by-period")
  @Access("stats.read")
  async byPeriod(@Query() query: PeriodQueryDto) {
    return this.statsService.byPeriod({ from: query.from, to: query.to, bucket: query.bucket });
  }

  @Get("files/:id/activity")
  @Access("stats.read")
  async fileActivity(
    @Param("id", ParseIntPipe) id: number,
    @Query() query: StatsRangeQueryDto,
    @Lang() lang: string | null
  ) {
    return this.statsService.activity(
      { page: 1, pageSize: 100, fileItemId: id, from: query.from, to: query.to },
      lang
    );
  }

  // Failed logins are audit data, so they follow the audit permission.
  @Get("logins")
  @Access("audit.read")
  async logins(@Query() query: TopQueryDto) {
    return this.statsService.loginActivity({ from: query.from, to: query.to, limit: query.limit });
  }

  @Get("storage")
  @Access("storage.read")
  async storage() {
    return this.statsService.storageUsage();
  }

  @Get("storage/largest")
  @Access("storage.read")
  async largestFiles(@Query() query: TopQueryDto, @Lang() lang: string | null) {
    return this.statsService.largestFiles({ limit: query.limit }, lang);
  }
}
