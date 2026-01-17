import { Module } from "@nestjs/common";
import { FilesService } from "./files.service";
import { FilesController } from "./files.controller";
import { FilesUserController } from "./files.user.controller";
import { AuditModule } from "../audit/audit.module";
import { DownloadsModule } from "../downloads/downloads.module";
import { TrashCleanupService } from "./trash-cleanup.service";

@Module({
  imports: [AuditModule, DownloadsModule],
  providers: [FilesService, TrashCleanupService],
  controllers: [FilesController, FilesUserController]
})
export class FilesModule {}
