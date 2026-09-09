import { IsInt, IsOptional, IsString } from "class-validator";
import { Type } from "class-transformer";
import { SortedPaginationDto } from "../../../common/dto/sorted-pagination.dto";

export class SessionsQueryDto extends SortedPaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  userId?: number;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;
}
