import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, Res } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import path from "path";
import { User } from "../../common/decorators/user.decorator";
import { Lang } from "../../common/decorators/lang.decorator";
import { Access } from "../../common/decorators/access.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { FilesService } from "./files.service";
import { FilesQueryDto } from "./dto/files-query.dto";
import { DownloadDto } from "./dto/download.dto";

@ApiTags("user/files")
@ApiBearerAuth()
@Roles("superadmin", "admin", "manager", "user")
@Controller("user")
export class FilesUserController {
  constructor(private readonly filesService: FilesService) {}

  @Get("menu")
  @Access("file.read")
  async menu(@User() user: any, @Lang() lang: string | null) {
    return this.filesService.getUserMenu(user, lang);
  }

  @Get("files")
  @Access("file.read")
  async list(@Query() query: FilesQueryDto, @User() user: any, @Lang() lang: string | null) {
    return this.filesService.listUserFiles(
      {
        page: query.page || 1,
        pageSize: query.pageSize || 20,
        q: query.q,
        sortBy: query.sortBy,
        sortDir: query.sortDir,
        sectionId: query.sectionId,
        categoryId: query.categoryId
      },
      user,
      lang
    );
  }

  @Get("files/:id")
  @Access("file.read")
  async getOne(
    @Param("id", ParseIntPipe) id: number,
    @User() user: any,
    @Lang() lang: string | null
  ) {
    return this.filesService.getUserFile(id, user, lang);
  }

  @Post("files/:id/download")
  @Access("file.download")
  async download(
    @Param("id", ParseIntPipe) id: number,
    @User() user: any,
    @Body() body: DownloadDto,
    @Res() res: Response
  ) {
    const asset = await this.filesService.download(id, user, body.lang || null);
    const filename = this.buildDownloadName(asset.original_name, asset.lang, asset.title);
    return res.download(asset.path, filename);
  }

  private buildDownloadName(originalName: string, lang?: string | null, title?: string | null) {
    const parsed = path.parse(originalName);
    const baseName = this.sanitizeFilename(title || parsed.name || originalName);
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
