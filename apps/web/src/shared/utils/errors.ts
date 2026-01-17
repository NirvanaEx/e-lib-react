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
