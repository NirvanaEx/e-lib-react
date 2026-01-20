import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
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
import { Access } from "../../common/decorators/access.decorator";
import { User } from "../../common/decorators/user.decorator";
import { Lang } from "../../common/decorators/lang.decorator";
import { FileRequestsService } from "./file-requests.service";
import { CreateFileRequestDto } from "./dto/create-file-request.dto";
import { FileRequestsQueryDto } from "./dto/file-requests-query.dto";
import { UploadAssetDto } from "./dto/upload-asset.dto";
import { UpdateFileRequestDto } from "./dto/update-file-request.dto";

const rawUploadDir = process.env.UPLOAD_DIR || "uploads";
const uploadDir = path.isAbsolute(rawUploadDir) ? rawUploadDir : path.resolve(process.cwd(), rawUploadDir);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const maxSize = Number(process.env.MAX_UPLOAD_SIZE_MB || 10) * 1024 * 1024;

@ApiTags("user/requests")
@ApiBearerAuth()
@Roles("superadmin", "admin", "manager", "user")
@Controller("user/requests")
export class FileRequestsUserController {
  constructor(private readonly fileRequestsService: FileRequestsService) {}

  @Get("access-options")
  @Access("file.read")
  async accessOptions(@User() user: any) {
    return this.fileRequestsService.getAccessOptions(user);
  }

  @Get()
  @Access("file.read")
  async list(@Query() query: FileRequestsQueryDto, @User() user: any, @Lang() lang: string | null) {
    return this.fileRequestsService.listUserRequests(
      {
        page: query.page || 1,
        pageSize: query.pageSize || 20,
        status: query.status,
        scope: query.scope,
        q: query.q
      },
      user,
      lang
    );
  }

  @Post()
  async create(@Body() body: CreateFileRequestDto, @User() user: any) {
    return this.fileRequestsService.createRequest(body, user);
  }

  @Post("update/:id")
  async updateRequest(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateFileRequestDto,
    @User() user: any
  ) {
    return this.fileRequestsService.createUpdateRequest(id, body, user);
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
  @Post(":id/assets")
  async uploadAsset(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UploadAssetDto,
    @UploadedFile() file: Express.Multer.File,
    @User() user: any
  ) {
    return this.fileRequestsService.uploadRequestAsset(id, body.lang, file, user);
  }

  @Post(":id/cancel")
  async cancel(@Param("id", ParseIntPipe) id: number, @User() user: any) {
    return this.fileRequestsService.cancelRequest(id, user);
  }
}
