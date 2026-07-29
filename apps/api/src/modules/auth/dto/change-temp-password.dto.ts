import { IsNotEmpty, IsString } from "class-validator";
import { IsPassword } from "../../../common/validators/password";

export class ChangeTempPasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  @IsPassword()
  newPassword!: string;
}
