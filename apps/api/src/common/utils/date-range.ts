/**
 * Фильтры «с … по …» приходят из <input type="date">, то есть датами без времени.
 * Сравнение `created_at <= '2026-08-14'` попадает в полночь и отбрасывает весь
 * выбранный день, поэтому верхняя граница делается исключающей — началом
 * следующих суток (тот же приём, что в статистике).
 *
 * Значения с временем (ISO-строка) остаются включающей границей: их смысл задан
 * вызывающей стороной точно, и подменять его не нужно.
 */
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function endOfDayExclusive(value: string) {
  if (!DATE_ONLY.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setDate(parsed.getDate() + 1);
  return parsed;
}

export function applyDateRange(query: any, column: string, from?: string | null, to?: string | null) {
  if (from) query.where(column, ">=", from);
  if (to) {
    const exclusive = endOfDayExclusive(to);
    if (exclusive) query.where(column, "<", exclusive);
    else query.where(column, "<=", to);
  }
  return query;
}
