import {
  BadRequestException,
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
import { avatarUploadOptions } from "./avatar-upload";
import { Roles } from "../../common/decorators/roles.decorator";
import { Access } from "../../common/decorators/access.decorator";
import { User } from "../../common/decorators/user.decorator";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UsersQueryDto } from "./dto/users-query.dto";
import { UsersService } from "./users.service";

@ApiTags("dashboard/users")
@ApiBearerAuth()
@Roles("superadmin", "admin")
@Access("dashboard.access")
@Controller("dashboard/users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("options")
  @Access("file.access.update")
  @Roles("superadmin", "admin", "manager")
  async options(@Query() query: UsersQueryDto) {
    return this.usersService.listOptions({
      page: query.page || 1,
      pageSize: query.pageSize || 20,
      q: query.q
    });
  }

  @Get()
  @Access("user.read")
  async list(@Query() query: UsersQueryDto) {
    return this.usersService.list({
      page: query.page || 1,
      pageSize: query.pageSize || 20,
      q: query.q
    });
  }

  @Post()
  @Access("user.add")
  async create(@Body() body: CreateUserDto, @User() actor: any) {
    return this.usersService.create(body, actor.id);
  }

  @Patch(":id")
  @Access("user.update")
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateUserDto,
    @User() actor: any
  ) {
    return this.usersService.update(id, body, actor.id);
  }

  @Delete(":id")
  @Access("user.delete")
  async remove(@Param("id", ParseIntPipe) id: number, @User() actor: any) {
    return this.usersService.softDelete(id, actor.id);
  }

  @Post(":id/restore")
  @Access("user.restore")
  async restore(@Param("id", ParseIntPipe) id: number, @User() actor: any) {
    return this.usersService.restore(id, actor.id);
  }

  @Post(":id/reset-password")
  @Access("user.reset_password")
  async resetPassword(@Param("id", ParseIntPipe) id: number, @User() actor: any) {
    return this.usersService.resetPassword(id, actor.id);
  }

  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("file", avatarUploadOptions))
  @Post(":id/avatar")
  @Access("user.update")
  async uploadAvatar(
    @Param("id", ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @User() actor: any
  ) {
    if (!file) {
      throw new BadRequestException("File is required");
    }
    return this.usersService.setAvatarByAdmin(id, file, actor.id);
  }

  @Delete(":id/avatar")
  @Access("user.update")
  async removeAvatar(@Param("id", ParseIntPipe) id: number, @User() actor: any) {
    return this.usersService.removeAvatarByAdmin(id, actor.id);
  }
}
