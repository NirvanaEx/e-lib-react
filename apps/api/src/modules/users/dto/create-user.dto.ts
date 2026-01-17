import { IsInt, IsNotEmpty, IsOptional, IsString, MinLength } from "class-validator";
import { Type } from "class-transformer";

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  login!: string;

  @IsString()
  @IsNotEmpty()
  surname!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  patronymic?: string | null;

  @Type(() => Number)
  @IsInt()
  roleId!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  departmentId?: number | null;

  @IsOptional()
  @IsString()
  lang?: string | null;
}
