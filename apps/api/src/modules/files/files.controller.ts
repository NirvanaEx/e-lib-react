import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors
} from "@nestjs/common";
import { ApiBearerAuth, ApiConsumes, ApiTags } from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import fs from "fs";
import path from "path";
import { Roles } from "../../common/decorators/roles.decorator";
import { User } from "../../common/decorators/user.decorator";
import { Lang } from "../../common/decorators/lang.decorator";
import { FilesService } from "./files.service";
import { CreateFileDto } from "./dto/create-file.dto";
import { UpdateFileDto } from "./dto/update-file.dto";
import { UpdateAccessDto } from "./dto/update-access.dto";
import { FilesQueryDto } from "./dto/files-query.dto";
import { CreateVersionDto } from "./dto/create-version.dto";
import { SetCurrentVersionDto } from "./dto/set-current-version.dto";
import { UploadAssetDto } from "./dto/upload-asset.dto";
import { TrashQueryDto } from "./dto/trash-query.dto";

const rawUploadDir = process.env.UPLOAD_DIR || "uploads";
const uploadDir = path.isAbsolute(rawUploadDir) ? rawUploadDir : path.resolve(process.cwd(), rawUploadDir);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const maxSize = Number(process.env.MAX_UPLOAD_SIZE_MB || 10) * 1024 * 1024;

@ApiTags("manage/files")
@ApiBearerAuth()
@Roles("superadmin", "admin", "manager")
@Controller("manage")
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Get("files")
  async list(@Query() query: FilesQueryDto, @Lang() lang: string | null) {
    return this.filesService.listManage(
      { page: query.page || 1, pageSize: query.pageSize || 20, q: query.q, sortBy: query.sortBy, sortDir: query.sortDir },
      lang
    );
  }

  @Post("files")
  async create(@Body() body: CreateFileDto, @User() actor: any) {
    return this.filesService.create(body, actor.id);
  }

  @Get("files/:id")
  async getOne(@Param("id", ParseIntPipe) id: number, @Lang() lang: string | null) {
    return this.filesService.getManage(id, lang);
  }

  @Patch("files/:id")
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateFileDto,
    @User() actor: any
  ) {
    return this.filesService.updateMetadata(id, body, actor.id);
  }

  @Patch("files/:id/access")
  async updateAccess(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateAccessDto,
    @User() actor: any
  ) {
    return this.filesService.updateAccess(id, body, actor.id);
  }

  @Delete("files/:id")
  async softDelete(@Param("id", ParseIntPipe) id: number, @User() actor: any) {
    return this.filesService.softDelete(id, actor.id);
  }

  @Post("files/:id/restore")
  async restore(@Param("id", ParseIntPipe) id: number, @User() actor: any) {
    return this.filesService.restore(id, actor.id);
  }

  @Get("files/:id/versions")
  async listVersions(@Param("id", ParseIntPipe) id: number) {
    return this.filesService.listVersions(id);
  }

  @Post("files/:id/versions")
  async createVersion(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: CreateVersionDto,
    @User() actor: any
  ) {
    return this.filesService.createVersion(id, body, actor.id);
  }

  @Patch("files/:id/current-version")
  async setCurrentVersion(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: SetCurrentVersionDto,
    @User() actor: any
  ) {
    return this.filesService.setCurrentVersion(id, body.versionId, actor.id);
  }

  @Delete("files/:id/versions/:versionId")
  async deleteVersion(
    @Param("id", ParseIntPipe) id: number,
    @Param("versionId", ParseIntPipe) versionId: number,
    @User() actor: any
  ) {
    return this.filesService.deleteVersion(id, versionId, actor.id);
  }

  @Post("files/:id/versions/:versionId/restore")
  async restoreVersion(
    @Param("id", ParseIntPipe) id: number,
    @Param("versionId", ParseIntPipe) versionId: number,
    @User() actor: any
  ) {
    return this.filesService.restoreVersion(id, versionId, actor.id);
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
  @Post("files/:id/versions/:versionId/assets")
  async uploadAsset(
    @Param("id", ParseIntPipe) id: number,
    @Param("versionId", ParseIntPipe) versionId: number,
    @Body() body: UploadAssetDto,
    @UploadedFile() file: Express.Multer.File,
    @User() actor: any
  ) {
    return this.filesService.uploadAsset(id, versionId, body.lang, file, actor.id);
  }

  @Delete("files/:id/versions/:versionId/assets/:assetId")
  async deleteAsset(
    @Param("id", ParseIntPipe) id: number,
    @Param("versionId", ParseIntPipe) versionId: number,
    @Param("assetId", ParseIntPipe) assetId: number,
    @User() actor: any
  ) {
    return this.filesService.deleteAsset(id, versionId, assetId, actor.id);
  }

  @Get("trash")
  async trash(@Query() query: TrashQueryDto, @Lang() lang: string | null) {
    return this.filesService.listTrash(
      { page: query.page || 1, pageSize: query.pageSize || 20, q: query.q },
      lang
    );
  }

  @Delete("trash/:id")
  async forceDelete(@Param("id", ParseIntPipe) id: number, @User() actor: any) {
    return this.filesService.forceDelete(id, actor.id);
  }
}
