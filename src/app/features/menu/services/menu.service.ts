import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type { ApiResponse } from '../../../core/models/api-response.model';
import type { PagedResult } from '../../websites/models/paged-result.model';
import type {
  CreateMenuRequest,
  MenuDto,
  MenuDetailsDto,
  UpdateMenuRequest,
  UpdateMenuStatusRequest
} from '../models/menu.model';
import type {
  MenuCategoryDto,
  CreateMenuCategoryRequest,
  UpdateMenuCategoryRequest,
  UpdateMenuCategoryStatusRequest,
  ReorderMenuCategoriesRequest
} from '../models/menu-category.model';
import type {
  MenuItemDto,
  CreateMenuItemRequest,
  UpdateMenuItemRequest,
  UpdateMenuItemAvailabilityRequest,
  UpdateMenuItemStatusRequest,
  MenuItemSummaryDto,
  MenuItemListQuery
} from '../models/menu-item.model';

/**
 * Menu management service. Mirrors the backend menu controllers:
 * MenusController (api/v1), MenuCategoriesController (api/v1),
 * MenuItemsController (api/v1/menu-items).
 *
 * Every call is tenant-scoped via the X-Tenant-Id header set by
 * TenantInterceptor from the active tenant; no tenantId is ever sent in
 * bodies or query params (the restaurant id lives in the URL path, which is
 * a supported location).
 */
@Injectable({
  providedIn: 'root'
})
export class MenuService {
  private readonly http = inject(HttpClient);
  private readonly menusUrl = `${environment.apiUrl}/v1/menus`;
  private readonly restaurantsMenusUrl = (restaurantId: string) =>
    `${environment.apiUrl}/v1/restaurants/${restaurantId}/menus`;
  private readonly categoriesUrl = `${environment.apiUrl}/v1/menu-categories`;
  private readonly itemsUrl = `${environment.apiUrl}/v1/menu-items`;

  /** Row 1 — GET api/v1/restaurants/{restaurantId}/menus?page=&pageSize= */
  getMenus(
    restaurantId: string,
    page = 1,
    pageSize = 20
  ): Observable<ApiResponse<PagedResult<MenuDto>>> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);

    return this.http.get<ApiResponse<PagedResult<MenuDto>>>(
      this.restaurantsMenusUrl(restaurantId),
      { params }
    );
  }

  /** Row 2 — GET api/v1/menus/{menuId} (menu + eager categories). */
  getMenu(menuId: string): Observable<ApiResponse<MenuDetailsDto>> {
    return this.http.get<ApiResponse<MenuDetailsDto>>(
      `${this.menusUrl}/${menuId}`
    );
  }

  /** Row 3 — POST api/v1/restaurants/{restaurantId}/menus. */
  createMenu(
    restaurantId: string,
    request: CreateMenuRequest
  ): Observable<ApiResponse<MenuDto>> {
    return this.http.post<ApiResponse<MenuDto>>(
      this.restaurantsMenusUrl(restaurantId),
      request
    );
  }

  /** Row 4 — PUT api/v1/menus/{menuId} (partial update). */
  updateMenu(
    menuId: string,
    request: UpdateMenuRequest
  ): Observable<ApiResponse<MenuDto>> {
    return this.http.put<ApiResponse<MenuDto>>(
      `${this.menusUrl}/${menuId}`,
      request
    );
  }

  /** Row 5 — PATCH api/v1/menus/{menuId}/status. */
  setMenuActive(
    menuId: string,
    isActive: boolean
  ): Observable<ApiResponse<MenuDto>> {
    return this.http.patch<ApiResponse<MenuDto>>(
      `${this.menusUrl}/${menuId}/status`,
      { isActive }
    );
  }

  /** Row 6 — DELETE api/v1/menus/{menuId} (terminal archive, 204 NoContent). */
  archiveMenu(menuId: string): Observable<void> {
    return this.http.delete<void>(`${this.menusUrl}/${menuId}`);
  }

  /** Row 7 — GET api/v1/menus/{menuId}/categories (not paged). */
  getCategories(menuId: string): Observable<ApiResponse<MenuCategoryDto[]>> {
    return this.http.get<ApiResponse<MenuCategoryDto[]>>(
      `${this.menusUrl}/${menuId}/categories`
    );
  }

  /** Row 8 — POST api/v1/menus/{menuId}/categories. */
  createCategory(
    menuId: string,
    request: CreateMenuCategoryRequest
  ): Observable<ApiResponse<MenuCategoryDto>> {
    return this.http.post<ApiResponse<MenuCategoryDto>>(
      `${this.menusUrl}/${menuId}/categories`,
      request
    );
  }

  /** Row 9 — PUT api/v1/menu-categories/{categoryId} (partial update). */
  updateCategory(
    categoryId: string,
    request: UpdateMenuCategoryRequest
  ): Observable<ApiResponse<MenuCategoryDto>> {
    return this.http.put<ApiResponse<MenuCategoryDto>>(
      `${this.categoriesUrl}/${categoryId}`,
      request
    );
  }

  /** Row 10 — PATCH api/v1/menu-categories/{categoryId}/status. */
  setCategoryActive(
    categoryId: string,
    isActive: boolean
  ): Observable<ApiResponse<MenuCategoryDto>> {
    return this.http.patch<ApiResponse<MenuCategoryDto>>(
      `${this.categoriesUrl}/${categoryId}/status`,
      { isActive }
    );
  }

  /** Row 11 — DELETE api/v1/menu-categories/{categoryId} (409 if items exist, 204 NoContent). */
  deleteCategory(categoryId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.categoriesUrl}/${categoryId}`
    );
  }

  /** Row 12 — PATCH api/v1/menus/{menuId}/categories/order (all ids exactly once). */
  reorderCategories(
    menuId: string,
    orderedCategoryIds: string[]
  ): Observable<ApiResponse<MenuCategoryDto[]>> {
    return this.http.patch<ApiResponse<MenuCategoryDto[]>>(
      `${this.menusUrl}/${menuId}/categories/order`,
      { orderedCategoryIds }
    );
  }

  /** Row 13 — GET api/v1/menu-categories/{categoryId}/items?page=&pageSize= (paged). */
  getCategoryItems(
    categoryId: string,
    page = 1,
    pageSize = 50
  ): Observable<ApiResponse<PagedResult<MenuItemDto>>> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);

    return this.http.get<ApiResponse<PagedResult<MenuItemDto>>>(
      `${this.categoriesUrl}/${categoryId}/items`,
      { params }
    );
  }

  /** Row 14 — GET api/v1/menus/{menuId}/items?page=&pageSize= (optional). */
  getMenuItems(
    menuId: string,
    page = 1,
    pageSize = 20
  ): Observable<ApiResponse<PagedResult<MenuItemDto>>> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);

    return this.http.get<ApiResponse<PagedResult<MenuItemDto>>>(
      `${this.menusUrl}/${menuId}/items`,
      { params }
    );
  }

  /** Row 14b — GET api/v1/menus/{menuId}/items with search, category, availability and sorting. */
  getMenuItemsQuery(
    menuId: string,
    query: MenuItemListQuery
  ): Observable<ApiResponse<PagedResult<MenuItemDto>>> {
    let params = new HttpParams()
      .set('page', query.page ?? 1)
      .set('pageSize', query.pageSize ?? 20);

    if (query.search) {
      params = params.set('search', query.search);
    }
    if (query.categoryId) {
      params = params.set('categoryId', query.categoryId);
    }
    if (query.isAvailable !== null && query.isAvailable !== undefined) {
      params = params.set('isAvailable', query.isAvailable);
    }
    if (query.sortBy) {
      params = params.set('sortBy', query.sortBy);
    }
    if (query.sortDirection) {
      params = params.set('sortDirection', query.sortDirection);
    }

    return this.http.get<ApiResponse<PagedResult<MenuItemDto>>>(
      `${this.menusUrl}/${menuId}/items`,
      { params }
    );
  }

  /** Row 14c — GET api/v1/menus/{menuId}/items/summary (dashboard stat cards). */
  getMenuSummary(
    menuId: string
  ): Observable<ApiResponse<MenuItemSummaryDto>> {
    return this.http.get<ApiResponse<MenuItemSummaryDto>>(
      `${this.menusUrl}/${menuId}/items/summary`
    );
  }

  /** Row 15 — POST api/v1/menu-categories/{categoryId}/items. */
  createItem(
    categoryId: string,
    request: CreateMenuItemRequest
  ): Observable<ApiResponse<MenuItemDto>> {
    return this.http.post<ApiResponse<MenuItemDto>>(
      `${this.categoriesUrl}/${categoryId}/items`,
      request
    );
  }

  /** Row 16 — GET api/v1/menu-items/{itemId}. */
  getItem(itemId: string): Observable<ApiResponse<MenuItemDto>> {
    return this.http.get<ApiResponse<MenuItemDto>>(`${this.itemsUrl}/${itemId}`);
  }

  /** Row 17 — PUT api/v1/menu-items/{itemId} (partial update). */
  updateItem(
    itemId: string,
    request: UpdateMenuItemRequest
  ): Observable<ApiResponse<MenuItemDto>> {
    return this.http.put<ApiResponse<MenuItemDto>>(
      `${this.itemsUrl}/${itemId}`,
      request
    );
  }

  /** Row 18 — PATCH api/v1/menu-items/{itemId}/availability. */
  setItemAvailability(
    itemId: string,
    isAvailable: boolean
  ): Observable<ApiResponse<MenuItemDto>> {
    return this.http.patch<ApiResponse<MenuItemDto>>(
      `${this.itemsUrl}/${itemId}/availability`,
      { isAvailable }
    );
  }

  /** Row 19 — PATCH api/v1/menu-items/{itemId}/status. */
  setItemActive(
    itemId: string,
    isActive: boolean
  ): Observable<ApiResponse<MenuItemDto>> {
    return this.http.patch<ApiResponse<MenuItemDto>>(
      `${this.itemsUrl}/${itemId}/status`,
      { isActive }
    );
  }

  /** Row 20 — DELETE api/v1/menu-items/{itemId} (soft delete, 204 NoContent). */
  deleteItem(itemId: string): Observable<void> {
    return this.http.delete<void>(`${this.itemsUrl}/${itemId}`);
  }
}
