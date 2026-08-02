import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested
} from "class-validator";

export class GuideBlockTranslationDto {
  @IsIn(["ru", "en", "uz"])
  lang!: string;

  @IsString()
  @MaxLength(500)
  title!: string;

  @IsString()
  @MaxLength(20000)
  body!: string;
}

export class GuideBlockDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  image?: string | null;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GuideBlockTranslationDto)
  translations!: GuideBlockTranslationDto[];
}

export class UpdateGuideDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => GuideBlockDto)
  blocks!: GuideBlockDto[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateGuideSettingsDto {
  @IsBoolean()
  isActive!: boolean;
}
