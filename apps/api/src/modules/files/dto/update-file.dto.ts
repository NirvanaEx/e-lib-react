import { ArrayMinSize, IsArray, IsInt, IsOptional, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { FileTranslationDto } from "./file-translation.dto";

export class UpdateFileDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sectionId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoryId?: number;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => FileTranslationDto)
  translations?: FileTranslationDto[];
}
