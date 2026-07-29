import { Module } from "@nestjs/common";
import { PositionsService } from "./positions.service";
import { PositionsController } from "./positions.controller";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [AuditModule],
  providers: [PositionsService],
  controllers: [PositionsController]
})
export class PositionsModule {}
