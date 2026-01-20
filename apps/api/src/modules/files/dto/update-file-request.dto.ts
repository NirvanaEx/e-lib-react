import { ArrayMinSize, IsArray, IsOptional, IsString, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { FileTranslationDto } from "./file-translation.dto";

export class UpdateFileRequestDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => FileTranslationDto)
  translations!: FileTranslationDto[];

  @IsOptional()
  @IsString()
  comment?: string | null;
}
