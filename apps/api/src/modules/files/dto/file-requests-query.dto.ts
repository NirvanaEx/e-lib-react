import { IsIn, IsOptional, IsString } from "class-validator";
import { PaginationDto } from "../../../common/dto/pagination.dto";

export class FileRequestsQueryDto extends PaginationDto {
  @IsOptional()
  @IsIn(["pending", "approved", "rejected", "canceled"])
  status?: string;

  @IsOptional()
  @IsIn(["pending", "history"])
  scope?: string;

  @IsOptional()
  @IsString()
  q?: string;
}
