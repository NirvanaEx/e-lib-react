import { Module } from "@nestjs/common";
import { FilesService } from "./files.service";
import { FilesController } from "./files.controller";
import { FilesUserController } from "./files.user.controller";
import { AuditModule } from "../audit/audit.module";
import { DownloadsModule } from "../downloads/downloads.module";
import { TrashCleanupService } from "./trash-cleanup.service";
import { FileRequestsService } from "./file-requests.service";
import { FileRequestsController } from "./file-requests.controller";
import { FileRequestsUserController } from "./file-requests.user.controller";

@Module({
  imports: [AuditModule, DownloadsModule],
  providers: [FilesService, FileRequestsService, TrashCleanupService],
  controllers: [FilesController, FilesUserController, FileRequestsController, FileRequestsUserController]
})
export class FilesModule {}
