import { IsArray, IsInt, IsOptional, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { TranslationDto } from "../../../common/dto/translation.dto";

export class UpdateCategoryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  parentId?: number | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TranslationDto)
  translations?: TranslationDto[];
}
