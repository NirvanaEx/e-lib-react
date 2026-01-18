import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, Res } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import path from "path";
import { Roles } from "../../common/decorators/roles.decorator";
import { Access } from "../../common/decorators/access.decorator";
import { Lang } from "../../common/decorators/lang.decorator";
import { User } from "../../common/decorators/user.decorator";
import { FileRequestsService } from "./file-requests.service";
import { FileRequestsQueryDto } from "./dto/file-requests-query.dto";
import { RejectFileRequestDto } from "./dto/reject-file-request.dto";

@ApiTags("dashboard/requests")
@ApiBearerAuth()
@Roles("superadmin", "admin", "manager")
@Access("dashboard.access")
@Controller("dashboard/requests")
export class FileRequestsController {
  constructor(private readonly fileRequestsService: FileRequestsService) {}

  @Get()
  @Access("file.read")
  async list(@Query() query: FileRequestsQueryDto, @Lang() lang: string | null) {
    return this.fileRequestsService.listAdminRequests(
      {
        page: query.page || 1,
        pageSize: query.pageSize || 20,
        status: query.status,
        scope: query.scope,
        q: query.q
      },
      lang
    );
  }

  @Post(":id/approve")
  @Access("file.add")
  async approve(@Param("id", ParseIntPipe) id: number, @User() actor: any) {
    return this.fileRequestsService.approveRequest(id, actor);
  }

  @Post(":id/reject")
  @Access("file.add")
  async reject(
    @Param("id", ParseIntPipe) id: number,
    @User() actor: any,
    @Body() body: RejectFileRequestDto
  ) {
    return this.fileRequestsService.rejectRequest(id, actor, body?.reason);
  }

  @Get(":id/assets")
  @Access("file.read")
  async assets(@Param("id", ParseIntPipe) id: number) {
    return this.fileRequestsService.listRequestAssets(id);
  }

  @Get(":id/assets/:assetId/download")
  @Access("file.read")
  async downloadAsset(
    @Param("id", ParseIntPipe) id: number,
    @Param("assetId", ParseIntPipe) assetId: number,
    @Res() res: Response
  ) {
    const asset = await this.fileRequestsService.getRequestAsset(id, assetId);
    const filename = this.buildDownloadName(asset.original_name, asset.lang);
    return res.download(asset.path, filename);
  }

  private buildDownloadName(originalName: string, lang?: string | null) {
    const parsed = path.parse(originalName);
    const baseName = this.sanitizeFilename(parsed.name || originalName);
    const suffix = lang ? `_${lang.toUpperCase()}` : "";
    const extension = parsed.ext || "";
    return `${baseName || "file"}${suffix}${extension}`;
  }

  private sanitizeFilename(value: string) {
    return value
      .replace(/[\\/:*?"<>|]+/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }
}
