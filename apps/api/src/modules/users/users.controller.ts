import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
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
}
