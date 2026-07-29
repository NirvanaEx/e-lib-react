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
