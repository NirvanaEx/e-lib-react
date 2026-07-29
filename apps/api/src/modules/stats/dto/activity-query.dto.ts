import { IsIn, IsInt, IsOptional, IsString } from "class-validator";
import { Type } from "class-transformer";
import { PaginationDto } from "../../../common/dto/pagination.dto";

export class ActivityQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  userId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  fileItemId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  departmentId?: number;

  @IsOptional()
  @IsIn(["download", "view", "all"])
  action?: string;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsIn(["asc", "desc"])
  sortDir?: string;
}
