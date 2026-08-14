import { IsInt, IsOptional, Max, Min } from "class-validator";
import { Type } from "class-transformer";

// The screens that load a whole tree at once ask for 1000 rows, so that is the
// ceiling. Without it any caller could ask for `pageSize=100000000` and make the
// API materialise the entire table in memory.
export const PAGE_SIZE_MAX = 1000;

export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PAGE_SIZE_MAX)
  pageSize?: number = 20;
}
