import { IsArray, IsOptional, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { TranslationDto } from "../../../common/dto/translation.dto";

export class UpdateSectionDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TranslationDto)
  translations?: TranslationDto[];
}
