import { IsBoolean, IsObject, IsOptional } from "class-validator";

export class UpdateAppSettingsDto {
  @IsOptional()
  @IsBoolean()
  testRibbonEnabled?: boolean;

  // Deep validation/normalization happens in AppSettingsService.sanitizeBranding;
  // the decorator only keeps the field from being stripped by the whitelist pipe.
  @IsOptional()
  @IsObject()
  branding?: Record<string, unknown>;
}
