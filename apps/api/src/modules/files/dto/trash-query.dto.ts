import { IsOptional, IsString } from "class-validator";
import { PaginationDto } from "../../../common/dto/pagination.dto";

export class TrashQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  q?: string;
}
