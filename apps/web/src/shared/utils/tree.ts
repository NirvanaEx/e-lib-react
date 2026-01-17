export function buildPathMap<T>(
  items: T[],
  getId: (item: T) => number,
  getParentId: (item: T) => number | null | undefined,
  getLabel: (item: T) => string
) {
  const byId = new Map<number, T>();
  items.forEach((item) => byId.set(getId(item), item));

  const cache = new Map<number, string[]>();

  const build = (item: T, seen: Set<number>) => {
    const id = getId(item);
    if (cache.has(id)) return cache.get(id) as string[];
    if (seen.has(id)) return [getLabel(item)];
    seen.add(id);
    const parentId = getParentId(item);
    const label = getLabel(item);
    if (parentId && byId.has(parentId)) {
      const parent = byId.get(parentId) as T;
      const segments = [...build(parent, seen), label];
      cache.set(id, segments);
      return segments;
    }
    const segments = [label];
    cache.set(id, segments);
    return segments;
  };

  items.forEach((item) => {
    build(item, new Set<number>());
  });

  return cache;
}

export function formatPath(segments: string[]) {
  return segments.join(" / ");
}
