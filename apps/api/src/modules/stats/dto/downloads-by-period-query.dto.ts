import { IsOptional, IsString } from "class-validator";

export class DownloadsByPeriodQueryDto {
  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @IsString()
  bucket?: string;
}
