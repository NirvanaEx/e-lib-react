import { IsArray, IsInt, IsOptional, IsString, MaxLength, ValidateNested } from "class-validator";
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

  @IsOptional()
  @IsString()
  @MaxLength(64)
  icon?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  iconColor?: string | null;
}
