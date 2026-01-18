import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../db/database.module";
import { ContentPagesController } from "./content-pages.controller";
import { ContentPagesUserController } from "./content-pages.user.controller";
import { ContentPagesService } from "./content-pages.service";

@Module({
  imports: [DatabaseModule],
  controllers: [ContentPagesController, ContentPagesUserController],
  providers: [ContentPagesService],
  exports: [ContentPagesService]
})
export class ContentPagesModule {}
