import { applyDecorators } from "@nestjs/common";
import { IsString, Matches, MaxLength, MinLength } from "class-validator";

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

// Single source of truth for the password policy so the temp-password change,
// the settings dialog and any future flow cannot drift apart.
export function IsPassword() {
  return applyDecorators(
    IsString(),
    MinLength(PASSWORD_MIN_LENGTH, {
      message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters long`
    }),
    // bcrypt silently truncates at 72 bytes; cap well before that.
    MaxLength(PASSWORD_MAX_LENGTH, {
      message: `Password must be at most ${PASSWORD_MAX_LENGTH} characters long`
    }),
    Matches(/\p{L}/u, { message: "Password must contain at least one letter" }),
    Matches(/\d/u, { message: "Password must contain at least one digit" })
  );
}
