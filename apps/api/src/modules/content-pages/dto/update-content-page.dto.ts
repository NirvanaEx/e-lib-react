import { ArrayMinSize, IsArray, IsBoolean, IsIn, IsOptional, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { ContentTranslationDto } from "./content-translation.dto";

export class UpdateContentPageDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ContentTranslationDto)
  translations!: ContentTranslationDto[];

  @IsIn(["once", "every_login"])
  displayMode!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresAcceptance?: boolean;
}
