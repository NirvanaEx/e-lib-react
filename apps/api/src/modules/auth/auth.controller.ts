import { Body, Controller, Get, Post, Req, Res } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Response } from "express";
import { Public } from "../../common/decorators/public.decorator";
import { User } from "../../common/decorators/user.decorator";
import { AllowTempPassword } from "../../common/decorators/allow-temp-password.decorator";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { ChangeTempPasswordDto } from "./dto/change-temp-password.dto";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService
  ) {}

  private getCookieOptions() {
    const isProd = this.config.get<string>("NODE_ENV") === "production";
    const rawSameSite = (this.config.get<string>("AUTH_COOKIE_SAMESITE", "lax") || "lax").toLowerCase();
    const sameSite = rawSameSite === "strict" || rawSameSite === "none" ? rawSameSite : "lax";
    const rawSecure = this.config.get<string>("AUTH_COOKIE_SECURE");
    const secure = rawSecure ? rawSecure === "true" : isProd;
    const domain = this.config.get<string>("AUTH_COOKIE_DOMAIN") || undefined;
    const maxAgeSec = Number(this.config.get<string>("AUTH_COOKIE_MAX_AGE") || 0);
    return {
      httpOnly: true,
      secure,
      sameSite: sameSite as "lax" | "strict" | "none",
      path: "/",
      domain,
      maxAge: Number.isFinite(maxAgeSec) && maxAgeSec > 0 ? maxAgeSec * 1000 : undefined
    };
  }

  private setAuthCookie(res: Response, token: string) {
    const cookieName = this.config.get<string>("AUTH_COOKIE_NAME", "access_token");
    res.cookie(cookieName, token, this.getCookieOptions());
  }

  private clearAuthCookie(res: Response) {
    const cookieName = this.config.get<string>("AUTH_COOKIE_NAME", "access_token");
    res.clearCookie(cookieName, { path: "/", domain: this.config.get<string>("AUTH_COOKIE_DOMAIN") || undefined });
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60 } })
  @Post("login")
  async login(@Body() body: LoginDto, @Req() req: any, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(
      body.login,
      body.password,
      req.ip,
      req.headers["user-agent"]
    );
    this.setAuthCookie(res, result.accessToken);
    return result;
  }

  @ApiBearerAuth()
  @Get("me")
  async me(@User() user: any) {
    return this.authService.me(user.id);
  }

  @ApiBearerAuth()
  @AllowTempPassword()
  @Post("change-temp-password")
  async changeTempPassword(
    @User() user: any,
    @Body() body: ChangeTempPasswordDto,
    @Res({ passthrough: true }) res: Response
  ) {
    const result = await this.authService.changeTempPassword(user.id, body.currentPassword, body.newPassword);
    this.setAuthCookie(res, result.accessToken);
    return result;
  }

  @Public()
  @Post("logout")
  async logout(@Res({ passthrough: true }) res: Response) {
    this.clearAuthCookie(res);
    return { success: true };
  }
}
