import { IsIn, IsNotEmpty, IsString } from "class-validator";

export class ContentTranslationDto {
  @IsIn(["ru", "en", "uz"])
  lang!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  body!: string;
}
