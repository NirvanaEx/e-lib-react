import { IsArray, IsBoolean, IsIn, IsInt, IsOptional } from "class-validator";
import { Type } from "class-transformer";

export class UpdateAccessDto {
  @IsIn(["public", "restricted", "department_closed"])
  accessType!: string;

  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  accessDepartmentIds?: number[];

  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  accessUserIds?: number[];

  @IsOptional()
  @IsBoolean()
  allowVersionAccess?: boolean;
}
