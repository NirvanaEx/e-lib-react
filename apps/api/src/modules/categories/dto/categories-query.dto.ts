import { IsOptional, IsString, IsInt } from "class-validator";
import { Type } from "class-transformer";
import { PaginationDto } from "../../../common/dto/pagination.dto";

export class CategoriesQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sectionId?: number;
}
