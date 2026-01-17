import { Body, Controller, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { User } from "../../common/decorators/user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { UsersService } from "./users.service";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { ChangeLanguageDto } from "./dto/change-language.dto";

@ApiTags("user/settings")
@ApiBearerAuth()
@Roles("superadmin", "admin", "user")
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
}
