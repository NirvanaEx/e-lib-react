import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, Res, UploadedFile, UseInterceptors } from "@nestjs/common";
import { ApiBearerAuth, ApiConsumes, ApiTags } from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import fs from "fs";
import { Response } from "express";
import path from "path";
import { User } from "../../common/decorators/user.decorator";
import { Lang } from "../../common/decorators/lang.decorator";
import { Access } from "../../common/decorators/access.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { FilesService } from "./files.service";
import { FilesQueryDto } from "./dto/files-query.dto";
import { DownloadDto } from "./dto/download.dto";
import { SubmitUserFileDto } from "./dto/submit-user-file.dto";

const rawUploadDir = process.env.UPLOAD_DIR || "uploads";
const uploadDir = path.isAbsolute(rawUploadDir) ? rawUploadDir : path.resolve(process.cwd(), rawUploadDir);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const maxSize = Number(process.env.MAX_UPLOAD_SIZE_MB || 10) * 1024 * 1024;

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

  @Get("menu/all")
  @Access("file.read")
  async menuAll(@Lang() lang: string | null) {
    return this.filesService.getUserMenuAll(lang);
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

  @ApiConsumes("multipart/form-data")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: uploadDir,
        filename: (_req, file, cb) => {
          const ext = path.extname(file.originalname);
          cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
        }
      }),
      limits: { fileSize: maxSize }
    })
  )
  @Post("files")
  async submitFile(
    @Body() body: SubmitUserFileDto,
    @UploadedFile() file: Express.Multer.File,
    @User() user: any
  ) {
    return this.filesService.submitUserFile(body, file, user);
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
