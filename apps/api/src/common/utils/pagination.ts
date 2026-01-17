export function buildPaginationMeta(page: number, pageSize: number, total: number) {
  return { page, pageSize, total };
}

export function parsePagination(query: any) {
  const page = Math.max(1, Number(query.page || 1));
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize || 20)));
  return { page, pageSize };
}
