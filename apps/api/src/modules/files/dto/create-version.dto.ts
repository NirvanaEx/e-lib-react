import { IsOptional, IsString, IsBoolean } from "class-validator";

export class CreateVersionDto {
  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsBoolean()
  copyFromCurrent?: boolean;
}
