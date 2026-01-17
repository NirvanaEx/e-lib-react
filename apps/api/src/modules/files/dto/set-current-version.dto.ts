import { IsInt } from "class-validator";
import { Type } from "class-transformer";

export class SetCurrentVersionDto {
  @Type(() => Number)
  @IsInt()
  versionId!: number;
}
