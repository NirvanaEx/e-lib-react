import { ArrayMinSize, IsArray, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { TranslationDto } from "../../../common/dto/translation.dto";

export class CreateSectionDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TranslationDto)
  translations!: TranslationDto[];
}
