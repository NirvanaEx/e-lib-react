import { Module } from "@nestjs/common";
import { CategoriesService } from "./categories.service";
import { CategoriesController } from "./categories.controller";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [AuditModule],
  providers: [CategoriesService],
  controllers: [CategoriesController]
})
export class CategoriesModule {}
