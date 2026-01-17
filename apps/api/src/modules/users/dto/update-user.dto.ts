import { IsInt, IsOptional, IsString } from "class-validator";
import { Type } from "class-transformer";

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  login?: string;

  @IsOptional()
  @IsString()
  surname?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  patronymic?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  roleId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  departmentId?: number | null;

  @IsOptional()
  @IsString()
  lang?: string | null;
}
