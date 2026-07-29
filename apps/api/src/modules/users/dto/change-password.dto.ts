import { IsNotEmpty, IsString } from "class-validator";
import { IsPassword } from "../../../common/validators/password";

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  @IsPassword()
  newPassword!: string;
}
