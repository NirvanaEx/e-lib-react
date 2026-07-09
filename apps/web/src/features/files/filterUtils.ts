export type FilterOption = { id: number; label: string; depth: number; path: string };

export function buildTreeOptions(
  items: Array<{ id: number; parentId?: number | null; title?: string | null; name?: string | null }>
) {
  const byParent = new Map<number | null, typeof items>();
  items.forEach((item) => {
    const key = item.parentId ?? null;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(item);
  });
  const result: FilterOption[] = [];
  const walk = (parentId: number | null, depth: number, prefix: string[]) => {
    (byParent.get(parentId) || []).forEach((item) => {
      const label = item.title || item.name || `#${item.id}`;
      const path = [...prefix, label];
      result.push({ id: item.id, label, depth, path: path.join(" / ") });
      walk(item.id, depth + 1, path);
    });
  };
  walk(null, 0, []);
  return result;
}

export function parseIds(value: string | null) {
  if (!value) return new Set<number>();
  return new Set(
    value
      .split(",")
      .map((item) => Number(item))
      .filter((id) => Number.isInteger(id) && id > 0)
  );
}

export function serializeIds(selected: Set<number>) {
  return Array.from(selected)
    .sort((a, b) => a - b)
    .join(",");
}
