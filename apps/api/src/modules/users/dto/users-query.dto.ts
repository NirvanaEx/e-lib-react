import { IsOptional, IsString } from "class-validator";
import { SortedPaginationDto } from "../../../common/dto/sorted-pagination.dto";

export class UsersQueryDto extends SortedPaginationDto {
  @IsOptional()
  @IsString()
  q?: string;
}
