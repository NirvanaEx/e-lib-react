import { BadRequestException, Body, Controller, Delete, Post, UploadedFile, UseInterceptors } from "@nestjs/common";
import { ApiBearerAuth, ApiConsumes, ApiTags } from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import { User } from "../../common/decorators/user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { UsersService } from "./users.service";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { ChangeLanguageDto } from "./dto/change-language.dto";
import { avatarUploadOptions } from "./avatar-upload";

@ApiTags("user/settings")
@ApiBearerAuth()
@Roles("superadmin", "admin", "manager", "user")
@Controller("user/settings")
export class UsersSettingsController {
  constructor(private readonly usersService: UsersService) {}

  @Post("password")
  async changePassword(@User() user: any, @Body() body: ChangePasswordDto) {
    return this.usersService.changePassword(user.id, body.currentPassword, body.newPassword);
  }

  @Post("language")
  async changeLanguage(@User() user: any, @Body() body: ChangeLanguageDto) {
    return this.usersService.changeLanguage(user.id, body.lang);
  }

  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("file", avatarUploadOptions))
  @Post("avatar")
  async uploadAvatar(@User() user: any, @UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException("File is required");
    }
    return this.usersService.setAvatar(user.id, file);
  }

  @Delete("avatar")
  async removeAvatar(@User() user: any) {
    return this.usersService.removeAvatar(user.id);
  }
}
