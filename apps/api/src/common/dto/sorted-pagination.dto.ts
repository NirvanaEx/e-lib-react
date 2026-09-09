import { IsIn, IsOptional, IsString } from "class-validator";
import { PaginationDto } from "./pagination.dto";

export class SortedPaginationDto extends PaginationDto {
  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsIn(["asc", "desc"])
  sortDir?: string;
}
