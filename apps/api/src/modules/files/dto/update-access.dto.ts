import { IsArray, IsIn, IsInt, IsOptional } from "class-validator";
import { Type } from "class-transformer";

export class UpdateAccessDto {
  @IsIn(["public", "restricted"])
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
}
