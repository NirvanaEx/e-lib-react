import { IsBoolean, IsOptional } from "class-validator";

export class UpdateAppSettingsDto {
  @IsOptional()
  @IsBoolean()
  testRibbonEnabled?: boolean;
}
