import { Controller, ForbiddenException, Get, Param, Res } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";
import type { Response } from "express";
import { Lang } from "../../common/decorators/lang.decorator";
import { User } from "../../common/decorators/user.decorator";
import { GuidesService } from "./guides.service";

// Инструкцию читают все, кто вошёл в систему. Отдельного права не заводим:
// текст описывает интерфейс, который пользователь и так видит. Инструкцию по
// панели показываем только тем, у кого есть доступ в панель.
@ApiTags("guides")
@ApiBearerAuth()
@Controller("guides")
export class GuidesController {
  constructor(private readonly guidesService: GuidesService) {}

  private assertCanRead(key: string, user: any) {
    if (key !== "admin") return;
    const permissions: string[] = user?.permissions || [];
    if (!permissions.includes("dashboard.access")) throw new ForbiddenException();
  }

  // Редактор инструкций видит и выключенную — иначе он не смог бы её проверить.
  private canSeeInactive(user: any) {
    const permissions: string[] = user?.permissions || [];
    return permissions.includes("content.read");
  }

  @Get()
  async statuses(@User() user: any) {
    const statuses = await this.guidesService.listStatuses();
    const permissions: string[] = user?.permissions || [];
    return {
      user: statuses.user,
      admin: permissions.includes("dashboard.access") ? statuses.admin : false
    };
  }

  @Get("image/:name")
  @SkipThrottle()
  async image(@Param("name") name: string, @Res() res: Response) {
    const { filePath, contentType } = await this.guidesService.resolveImagePath(`uploads/${name}`).catch(() =>
      this.guidesService.resolveImagePath(`builtin/${name}`)
    );
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "private, max-age=86400");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.sendFile(filePath);
  }

  @Get(":key")
  async getOne(@Param("key") key: string, @User() user: any, @Lang() lang: string | null) {
    this.assertCanRead(key, user);
    return this.guidesService.getGuide(key, lang, { allowInactive: this.canSeeInactive(user) });
  }

  @Get(":key/docx")
  async docx(
    @Param("key") key: string,
    @User() user: any,
    @Lang() lang: string | null,
    @Res() res: Response
  ) {
    this.assertCanRead(key, user);
    const { buffer, fileName } = await this.guidesService.buildDocx(key, lang, {
      allowInactive: this.canSeeInactive(user)
    });
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    // Имя файла кириллическое; res.attachment сам добавит ASCII-запасной вариант
    // и filename*=UTF-8. Ручной setHeader на кириллице роняет Node.
    res.attachment(fileName);
    res.send(buffer);
  }
}
