import { Body, Controller, Get, Post, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Public } from "../../common/decorators/public.decorator";
import { User } from "../../common/decorators/user.decorator";
import { AllowTempPassword } from "../../common/decorators/allow-temp-password.decorator";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { ChangeTempPasswordDto } from "./dto/change-temp-password.dto";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60 } })
  @Post("login")
  async login(@Body() body: LoginDto, @Req() req: any) {
    return this.authService.login(
      body.login,
      body.password,
      req.ip,
      req.headers["user-agent"]
    );
  }

  @ApiBearerAuth()
  @Get("me")
  async me(@User() user: any) {
    return { user };
  }

  @ApiBearerAuth()
  @AllowTempPassword()
  @Post("change-temp-password")
  async changeTempPassword(@User() user: any, @Body() body: ChangeTempPasswordDto) {
    return this.authService.changeTempPassword(user.id, body.currentPassword, body.newPassword);
  }
}
