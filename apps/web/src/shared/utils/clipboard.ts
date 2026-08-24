/**
 * navigator.clipboard доступен только в secure context (https или localhost).
 * По http (LAN-адрес, доменное имя без сертификата) он undefined, поэтому
 * нужен запасной вариант через скрытый textarea + document.execCommand.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // Наличие API не проверяем через isSecureContext: при ошибке сертификата
  // браузеры отдают его по-разному, поэтому дешевле попробовать и поймать
  // отказ, чем угадывать контекст заранее.
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // API есть, но запрещён: не secure context, окно не в фокусе, отказано
      // в разрешении. Падаем в запасной вариант ниже.
    }
  }

  return legacyCopy(text);
}

/**
 * Копирование через выделение во временном textarea. Требует «жеста
 * пользователя», поэтому вызывать только из обработчика клика.
 */
function legacyCopy(text: string): boolean {
  if (typeof document === "undefined") return false;

  let textarea: HTMLTextAreaElement | null = null;
  try {
    textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "0";
    textarea.style.left = "0";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);

    const selection = document.getSelection();
    const previousRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);

    const ok = document.execCommand("copy");

    if (previousRange && selection) {
      selection.removeAllRanges();
      selection.addRange(previousRange);
    }

    return ok;
  } catch {
    return false;
  } finally {
    // В finally, иначе исключение посреди выделения оставит textarea в DOM.
    textarea?.remove();
  }
}

/**
 * Выделяет содержимое поля, чтобы пользователь мог дожать Ctrl+C сам.
 * Нужен, когда программное копирование запрещено политикой браузера: текст
 * уже выделен, и ручное копирование сводится к одной комбинации клавиш.
 */
export function selectFieldContent(field: HTMLInputElement | HTMLTextAreaElement | null | undefined) {
  if (!field) return;
  try {
    field.focus();
    field.select();
    field.setSelectionRange(0, field.value.length);
  } catch {
    // Поле могло исчезнуть из DOM — выделять нечего.
  }
}
