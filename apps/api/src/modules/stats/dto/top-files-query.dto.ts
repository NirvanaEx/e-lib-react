import { IsOptional, IsString } from "class-validator";

export class TopFilesQueryDto {
  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;
}
