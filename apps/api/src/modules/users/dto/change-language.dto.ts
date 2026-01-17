import { IsIn } from "class-validator";

export class ChangeLanguageDto {
  @IsIn(["ru", "en", "uz"])
  lang!: string;
}
