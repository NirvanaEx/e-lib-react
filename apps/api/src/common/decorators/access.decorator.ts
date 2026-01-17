import { SetMetadata } from "@nestjs/common";
import { ACCESS_KEY } from "../constants";

export const Access = (...permissions: string[]) => SetMetadata(ACCESS_KEY, permissions);
