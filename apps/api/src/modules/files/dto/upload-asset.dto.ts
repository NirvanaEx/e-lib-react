import { IsIn } from "class-validator";

export class UploadAssetDto {
  @IsIn(["ru", "en", "uz"])
  lang!: string;
}
