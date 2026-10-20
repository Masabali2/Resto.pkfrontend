/** Mirrors backend PagedResult<T> (Items/Page/PageSize/TotalCount + computed TotalPages). */
export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
