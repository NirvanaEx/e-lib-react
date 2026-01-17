export function getFilenameFromDisposition(disposition?: string | null) {
  if (!disposition) return null;
  const utf8Match = disposition.match(/filename\*\s*=\s*(?:UTF-8''|)([^;]+)/i);
  if (utf8Match) {
    return decodeURIComponent(utf8Match[1].replace(/"/g, ""));
  }
  const match = disposition.match(/filename\s*=\s*"?([^";]+)"?/i);
  if (match) {
    return match[1];
  }
  return null;
}
