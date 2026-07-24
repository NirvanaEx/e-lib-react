import { Controller, Get, Param, ParseIntPipe, Res } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";
import type { Response } from "express";
import { Roles } from "../../common/decorators/roles.decorator";
import { UsersService } from "./users.service";

@ApiTags("users")
@ApiBearerAuth()
@Roles("superadmin", "admin", "manager", "user")
@Controller("users")
export class UsersAvatarController {
  constructor(private readonly usersService: UsersService) {}

  @Get(":id/avatar")
  @SkipThrottle()
  async getAvatar(@Param("id", ParseIntPipe) id: number, @Res() res: Response) {
    const { filePath, contentType } = await this.usersService.getAvatarFile(id);
    res.setHeader("Content-Type", contentType);
    // Uploads get a unique filename each time, so the URL (with ?v=) is safe to cache.
    res.setHeader("Cache-Control", "private, max-age=86400");
    // Helmet defaults to same-origin CORP; the web app may run on another port in dev.
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.sendFile(filePath);
  }
}
