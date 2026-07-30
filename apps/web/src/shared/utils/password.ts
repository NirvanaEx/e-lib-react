import { z } from "zod";

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

type Translate = (key: string, options?: Record<string, unknown>) => string;

/**
 * Зеркало серверной политики из apps/api/src/common/validators/password.ts.
 * Держим правила и здесь, иначе форма пропускает пароль, а API отвечает сухим
 * 400 со списком английских сообщений. При изменении политики правим оба места.
 */
export function passwordFieldSchema(t: Translate) {
  return z
    .string()
    .min(PASSWORD_MIN_LENGTH, { message: t("passwordTooShort", { count: PASSWORD_MIN_LENGTH }) })
    .max(PASSWORD_MAX_LENGTH, { message: t("passwordTooLong", { count: PASSWORD_MAX_LENGTH }) })
    .regex(/\p{L}/u, { message: t("passwordNeedsLetter") })
    .regex(/\d/u, { message: t("passwordNeedsDigit") });
}
