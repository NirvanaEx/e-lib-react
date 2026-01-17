import { Module } from "@nestjs/common";
import { DownloadsService } from "./downloads.service";

@Module({
  providers: [DownloadsService],
  exports: [DownloadsService]
})
export class DownloadsModule {}
