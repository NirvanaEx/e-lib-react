import { SetMetadata } from "@nestjs/common";
import { ALLOW_TEMP_PASSWORD_KEY } from "../constants";

export const AllowTempPassword = () =>
  SetMetadata(ALLOW_TEMP_PASSWORD_KEY, true);
