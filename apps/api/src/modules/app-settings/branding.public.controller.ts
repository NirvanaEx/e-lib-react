import { Controller, Get, Param, Res } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";
import type { Response } from "express";
import { Public } from "../../common/decorators/public.decorator";
import { AppSettingsService } from "./app-settings.service";

// The login screen needs the wallpaper and logo before authentication, so the
// branding config and its images are served without a token. The payload holds
// nothing sensitive: hero texts, image file names and the carousel interval.
@ApiTags("public/branding")
@Public()
@Controller("public/branding")
export class BrandingPublicController {
  constructor(private readonly appSettingsService: AppSettingsService) {}

  @Get()
  async getBranding() {
    return this.appSettingsService.getBranding();
  }

  @Get("file/:name")
  @SkipThrottle()
  async getFile(@Param("name") name: string, @Res() res: Response) {
    const { filePath, contentType } = await this.appSettingsService.getBrandingFile(name);
    res.setHeader("Content-Type", contentType);
    // Uploads get a unique filename each time, so the URL is safe to cache.
    res.setHeader("Cache-Control", "public, max-age=86400");
    // Helmet defaults to same-origin CORP; the web app may run on another port in dev.
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.sendFile(filePath);
  }
}
