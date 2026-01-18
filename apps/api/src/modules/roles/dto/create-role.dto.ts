import { IsInt, IsOptional, IsString, Max, Min, MinLength } from "class-validator";

export class CreateRoleDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(99)
  level?: number;
}
