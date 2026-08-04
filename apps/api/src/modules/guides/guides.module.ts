import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../db/database.module";
import { GuidesAdminController } from "./guides.admin.controller";
import { GuidesController } from "./guides.controller";
import { GuidesService } from "./guides.service";

@Module({
  imports: [DatabaseModule],
  controllers: [GuidesController, GuidesAdminController],
  providers: [GuidesService],
  exports: [GuidesService]
})
export class GuidesModule {}
