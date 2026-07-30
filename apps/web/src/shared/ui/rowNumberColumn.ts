import type { Column } from "./DataTable";

/**
 * Столбец «№» для таблиц: порядковый номер строки, а не id.
 *
 * Нумерация идёт по убыванию — верхняя строка первой страницы получает номер,
 * равный общему количеству записей, дальше номер уменьшается. При серверной
 * пагинации передаём page/pageSize, чтобы вторая страница продолжала счёт
 * (total - pageSize и ниже). Для деревьев pageSize опускаем и передаём в total
 * количество видимых строк.
 */
export function rowNumberColumn<T>({
  total,
  page,
  pageSize,
  width = 56,
  order = "desc"
}: {
  total: number;
  page?: number;
  pageSize?: number;
  width?: number;
  /** desc — как в списках записей; asc — для рейтингов «топ-N». */
  order?: "asc" | "desc";
}): Column<T> {
  const offset = page && pageSize ? (page - 1) * pageSize : 0;

  return {
    key: "__rowNumber",
    label: "№",
    sortable: false,
    width,
    minWidth: width,
    headerSx: { pl: 1.5, pr: 0.5 },
    cellSx: { pl: 1.5, pr: 0.5, color: "text.secondary", fontVariantNumeric: "tabular-nums" },
    render: (_row, index) => (order === "asc" ? offset + index + 1 : Math.max(0, total - offset - index))
  };
}
