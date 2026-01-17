export type Lang = "ru" | "en" | "uz";

export type AccessType = "public" | "restricted";

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}
