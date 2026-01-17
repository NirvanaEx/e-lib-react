import { IsOptional, IsString, IsInt } from "class-validator";
import { Type } from "class-transformer";
import { PaginationDto } from "../../../common/dto/pagination.dto";

export class AuditQueryDto extends PaginationDto {
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
