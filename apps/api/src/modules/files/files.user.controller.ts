import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, Res } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import { User } from "../../common/decorators/user.decorator";
import { Lang } from "../../common/decorators/lang.decorator";
import { FilesService } from "./files.service";
import { FilesQueryDto } from "./dto/files-query.dto";
import { DownloadDto } from "./dto/download.dto";

@ApiTags("user/files")
@ApiBearerAuth()
@Controller("user")
export class FilesUserController {
  constructor(private readonly filesService: FilesService) {}

  @Get("menu")
  async menu(@User() user: any, @Lang() lang: string | null) {
    return this.filesService.getUserMenu(user, lang);
  }

  @Get("files")
  async list(@Query() query: FilesQueryDto, @User() user: any, @Lang() lang: string | null) {
    return this.filesService.listUserFiles(
      { page: query.page || 1, pageSize: query.pageSize || 20, q: query.q, sortBy: query.sortBy, sortDir: query.sortDir },
      user,
      lang
    );
  }

  @Get("files/:id")
  async getOne(
    @Param("id", ParseIntPipe) id: number,
    @User() user: any,
    @Lang() lang: string | null
  ) {
    return this.filesService.getUserFile(id, user, lang);
  }

  @Post("files/:id/download")
  async download(
    @Param("id", ParseIntPipe) id: number,
    @User() user: any,
    @Body() body: DownloadDto,
    @Res() res: Response
  ) {
    const asset = await this.filesService.download(id, user, body.lang || null);
    return res.download(asset.path, asset.original_name);
  }
}
