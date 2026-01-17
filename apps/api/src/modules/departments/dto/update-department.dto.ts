import { IsInt, IsOptional, IsString } from "class-validator";
import { Type } from "class-transformer";

export class UpdateDepartmentDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  parentId?: number | null;
}
