import { IsOptional, IsString, MaxLength } from "class-validator";

export class RejectFileRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}
