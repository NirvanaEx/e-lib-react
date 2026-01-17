import { IsOptional, IsString, IsInt } from "class-validator";
import { Type } from "class-transformer";

export class UserDownloadsQueryDto {
  @Type(() => Number)
  @IsInt()
  userId!: number;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;
}
