
/**
 * Mirrors the backend `PagedResult<T>` envelope (items, totalCount, page,
 * pageSize and the computed totalPages).
 *
 * This is the single pagination contract of the application: feature models
 * alias it instead of declaring a second, identical shape.
 */
export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
