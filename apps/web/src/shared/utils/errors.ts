type ApiErrorBody = {
  message?: string | string[];
  code?: string;
  activeFiles?: number;
  trashedFiles?: number;
  childCount?: number;
};

function getErrorBody(error: unknown): ApiErrorBody | null {
  if (!error || typeof error !== "object") return null;
  const anyError = error as { response?: { data?: ApiErrorBody } };
  const data = anyError.response?.data;
  return data && typeof data === "object" ? data : null;
}

export function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error === "object") {
    const anyError = error as { message?: string; response?: { data?: { message?: string | string[] } } };
    const message = anyError.response?.data?.message ?? anyError.message;
    if (Array.isArray(message)) {
      return message.join(", ");
    }
    if (typeof message === "string") {
      return message;
    }
  }

  return fallback;
}

/**
 * Разбирает отказы смены пароля: API помечает их кодом, поэтому сообщение не
 * зависит от английского текста ответа. Всё неизвестное (например, политика
 * пароля, если она разойдётся с клиентской) отдаём как есть.
 */
export function getPasswordErrorMessage(
  error: unknown,
  t: (key: string, options?: Record<string, unknown>) => string,
  fallback: string
) {
  const code = getErrorBody(error)?.code;
  if (code === "CURRENT_PASSWORD_INVALID") return t("currentPasswordInvalid");
  if (code === "PASSWORD_REUSED") return t("passwordMustDiffer");
  return getErrorMessage(error, fallback);
}

/** Код ошибки пароля — нужен, чтобы подсветить конкретное поле формы. */
export function getPasswordErrorCode(error: unknown) {
  return getErrorBody(error)?.code || null;
}

/**
 * Блокировка входа после серии неудачных попыток: API отдаёт 429 и retryAfter
 * в секундах. Превращаем в человеческую фразу, чтобы в уведомлении было видно,
 * сколько ждать, а не просто «ошибка входа».
 */
export function getLoginLockoutMessage(
  error: unknown,
  t: (key: string, options?: Record<string, unknown>) => string
) {
  const anyError = error as { response?: { status?: number; data?: { retryAfter?: number } } } | null;
  if (anyError?.response?.status !== 429) return null;

  const seconds = Math.max(1, Math.ceil(Number(anyError.response?.data?.retryAfter || 0)));
  if (!Number.isFinite(seconds) || seconds <= 0) return t("loginLockedUnknown");

  const minutes = Math.floor(seconds / 60);
  const restSeconds = seconds % 60;
  const parts: string[] = [];
  if (minutes > 0) parts.push(t("durationMinutes", { count: minutes }));
  if (restSeconds > 0 || minutes === 0) parts.push(t("durationSeconds", { count: restSeconds }));

  return t("loginLockedFor", { time: parts.join(" ") });
}

/**
 * Turns the structured refusals the API sends when a section or category is
 * still in use into a localized sentence with the actual counts. Falls back to
 * the plain message so unknown errors still surface something.
 */
export function getDeleteBlockedMessage(
  error: unknown,
  t: (key: string, options?: Record<string, unknown>) => string,
  fallback: string
) {
  const body = getErrorBody(error);
  const code = body?.code;
  if (!code) return getErrorMessage(error, fallback);

  const activeFiles = Number(body?.activeFiles || 0);
  const trashedFiles = Number(body?.trashedFiles || 0);

  if (code === "SECTION_HAS_FILES" || code === "CATEGORY_HAS_FILES") {
    const base = code === "SECTION_HAS_FILES" ? t("deleteBlockedSection") : t("deleteBlockedCategory");
    const parts: string[] = [];
    if (activeFiles > 0) parts.push(t("deleteBlockedActive", { count: activeFiles }));
    if (trashedFiles > 0) parts.push(t("deleteBlockedTrashed", { count: trashedFiles }));
    return parts.length ? `${base} ${parts.join(", ")}` : base;
  }

  if (code === "CATEGORY_HAS_CHILDREN") {
    return t("deleteBlockedChildren", { count: Number(body?.childCount || 0) });
  }

  return getErrorMessage(error, fallback);
}
