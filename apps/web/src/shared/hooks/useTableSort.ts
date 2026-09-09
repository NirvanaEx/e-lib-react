import { useCallback, useState } from "react";

export function useTableSort(setPage: (page: number) => void) {
  const [sort, setSort] = useState<{ key: string | null; direction: "asc" | "desc" | null }>({
    key: null,
    direction: null
  });
  const onSortChange = useCallback((key: string, direction: "asc" | "desc" | null) => {
    setSort({ key: direction ? key : null, direction });
    setPage(1);
  }, [setPage]);
  return {
    sort,
    onSortChange,
    sortParams: {
      sortBy: sort.direction ? sort.key || undefined : undefined,
      sortDir: sort.direction || undefined
    }
  };
}
