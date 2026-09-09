import { IsIn, IsOptional, IsString } from "class-validator";
import { SortedPaginationDto } from "../../../common/dto/sorted-pagination.dto";

export class FileRequestsQueryDto extends SortedPaginationDto {
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
