import { IsIn, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class FileTranslationDto {
  @IsIn(["ru", "en", "uz"])
  lang!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string | null;
}
