import type { Knex } from "knex";

export type SortParams = { sortBy?: string; sortDir?: string };

export function translatedTitle(db: Knex, table: string, foreignKey: string, ownerId: string, lang: string | null, defaultLang: string) {
  return db.raw(`(select t.title from ?? t where t.?? = ??
    order by array_position(?::text[], t.lang), t.lang limit 1)`,
  [table, foreignKey, ownerId, [lang || defaultLang, defaultLang, "ru"]]);
}

export function departmentPath(db: Knex, ownerId: string) {
  return db.raw(`(with recursive parents as (
    select id, parent_id, name::text as path, array[id] as visited from departments where id = ??
    union all
    select d.id, d.parent_id, d.name || ' / ' || p.path, p.visited || d.id
    from departments d join parents p on d.id = p.parent_id where not d.id = any(p.visited)
  ) select path from parents order by cardinality(visited) desc limit 1)`, [ownerId]);
}

export function categoryPath(db: Knex, ownerId: string, lang: string | null, defaultLang: string) {
  return db.raw(`(with recursive labels as (
    select c.id, c.parent_id, coalesce(?, '#' || c.id) as title from categories c
  ), parents as (
    select id, parent_id, title as path, array[id] as visited from labels where id = ??
    union all
    select c.id, c.parent_id, c.title || ' / ' || p.path, p.visited || c.id
    from labels c join parents p on c.id = p.parent_id where not c.id = any(p.visited)
  ) select path from parents order by cardinality(visited) desc limit 1)`,
  [translatedTitle(db, "categories_translations", "category_id", "c.id", lang, defaultLang), ownerId]);
}

/** Page entity IDs first so a one-to-many translation join cannot split records. */
export async function selectJoinedPage(
  query: Knex.QueryBuilder,
  params: SortParams & { page: number; pageSize: number },
  columns: Record<string, string | Knex.Raw>,
  fallback: string,
  fallbackDirection: "asc" | "desc",
  idColumn: string
) {
  const supported = params.sortBy && Object.prototype.hasOwnProperty.call(columns, params.sortBy);
  const expression = columns[supported ? params.sortBy! : fallback];
  const direction = supported ? (params.sortDir === "desc" ? "desc" : "asc") : fallbackDirection;
  const pageRows = await query.clone().clearSelect().clearOrder()
    .select({ id: idColumn }).select({ sort_value: expression }).distinct()
    .orderBy("sort_value", direction, "last").orderBy(idColumn, "asc")
    .offset((params.page - 1) * params.pageSize).limit(params.pageSize);
  if (!pageRows.length) return [];
  const order = new Map<number, number>(pageRows.map((row: any, index: number) => [row.id, index]));
  const rows = await query.clone().clearOrder().whereIn(idColumn, pageRows.map((row: any) => row.id));
  return rows.sort((a: any, b: any) =>
    order.get(a.id)! - order.get(b.id)! || String(a.lang || "").localeCompare(String(b.lang || ""))
  );
}

/** Only server-defined expressions may become ORDER BY clauses. */
export function applySorting(
  query: Knex.QueryBuilder,
  params: SortParams,
  columns: Record<string, string | Knex.Raw>,
  fallback: string,
  fallbackDirection: "asc" | "desc",
  uniqueColumns: string[]
) {
  const supported = params.sortBy && Object.prototype.hasOwnProperty.call(columns, params.sortBy);
  const column = supported ? columns[params.sortBy!] : columns[fallback];
  const direction = supported ? (params.sortDir === "desc" ? "desc" : "asc") : fallbackDirection;
  query.clearOrder().orderByRaw(`?? ${direction} nulls last`, [column]);
  // Equal values must keep the same order across page requests.
  uniqueColumns.forEach((key) => query.orderBy(key, "asc"));
  return query;
}
