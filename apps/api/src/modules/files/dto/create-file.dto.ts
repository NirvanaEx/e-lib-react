import { ArrayMinSize, IsArray, IsIn, IsInt, IsOptional, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { FileTranslationDto } from "./file-translation.dto";

export class CreateFileDto {
  @Type(() => Number)
  @IsInt()
  sectionId!: number;

  @Type(() => Number)
  @IsInt()
  categoryId!: number;

  @IsIn(["public", "restricted"])
  accessType!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => FileTranslationDto)
  translations!: FileTranslationDto[];

  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  accessDepartmentIds?: number[];

  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  accessUserIds?: number[];
}
