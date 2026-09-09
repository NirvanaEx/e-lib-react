import { IsOptional, IsString, IsInt } from "class-validator";
import { Type } from "class-transformer";
import { SortedPaginationDto } from "../../../common/dto/sorted-pagination.dto";

export class AuditQueryDto extends SortedPaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  actorId?: number;

  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;
}
