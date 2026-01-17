import { IsIn, IsOptional } from "class-validator";

export class DownloadDto {
  @IsOptional()
  @IsIn(["ru", "en", "uz"])
  lang?: string;
}
