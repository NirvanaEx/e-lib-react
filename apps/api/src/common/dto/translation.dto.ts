import { IsIn, IsNotEmpty, IsString } from "class-validator";

export class TranslationDto {
  @IsIn(["ru", "en", "uz"])
  lang!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;
}
