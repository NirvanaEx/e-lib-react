import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Roles } from "../../common/decorators/roles.decorator";
import { Access } from "../../common/decorators/access.decorator";
import { User } from "../../common/decorators/user.decorator";
import { PositionsService } from "./positions.service";
import { CreatePositionDto } from "./dto/create-position.dto";
import { UpdatePositionDto } from "./dto/update-position.dto";
import { PositionsQueryDto } from "./dto/positions-query.dto";

@ApiTags("dashboard/positions")
@ApiBearerAuth()
@Roles("superadmin", "admin")
@Access("dashboard.access")
@Controller("dashboard/positions")
export class PositionsController {
  constructor(private readonly positionsService: PositionsService) {}

  @Get("options")
  @Access("user.read")
  @Roles("superadmin", "admin", "manager")
  async options(@Query() query: PositionsQueryDto) {
    return this.positionsService.listOptions({
      page: query.page || 1,
      pageSize: query.pageSize || 20,
      q: query.q
    });
  }

  @Get()
  @Access("position.read")
  async list(@Query() query: PositionsQueryDto) {
    return this.positionsService.list({
      page: query.page || 1,
      pageSize: query.pageSize || 20,
      q: query.q
    });
  }

  @Post()
  @Access("position.add")
  async create(@Body() body: CreatePositionDto, @User() actor: any) {
    return this.positionsService.create(body, actor.id);
  }

  @Patch(":id")
  @Access("position.update")
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdatePositionDto,
    @User() actor: any
  ) {
    return this.positionsService.update(id, body, actor.id);
  }

  @Delete(":id")
  @Access("position.delete")
  async remove(@Param("id", ParseIntPipe) id: number, @User() actor: any) {
    return this.positionsService.remove(id, actor.id);
  }
}
