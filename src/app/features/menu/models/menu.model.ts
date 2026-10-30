import type { MenuCategoryDto } from './menu-category.model';
import type { MenuItemDto } from './menu-item.model';

/**
 * Mirrors backend MenuDto / MenuDetailsDto
 * (RestaurantSaaS.Application/Features/Menus/DTOs/MenuDtos.cs).
 * All menu calls are tenant-scoped; the backend derives tenantId from the
 * authenticated session and the X-Tenant-Id header.
 */
export type MenuStatus = 'Draft' | 'Published' | 'Archived';

export interface MenuDto {
  id: string;
  tenantId: string;
  restaurantId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  status: MenuStatus;
  createdAt: string;
  updatedAt: string | null;
}

/**
 * GET /api/v1/menus/{menuId} returns the menu with its categories eager-loaded.
 * Categories are not paged (see R5).
 */
export interface MenuDetailsDto extends MenuDto {
  categories: MenuCategoryDto[];
}

/**
 * Read-only platform default menu returned by GET /api/v1/menus/default.
 * Mirrors DefaultMenuDetailsDto / DefaultMenuCategoryDto on the backend.
 */
export interface DefaultMenuCategoryDto {
  id: string;
  name: string;
  description: string | null;
  displayOrder: number;
  items: MenuItemDto[];
}

export interface DefaultMenuDetailsDto {
  id: string;
  name: string;
  description: string | null;
  status: MenuStatus;
  categoryCount: number;
  itemCount: number;
  categories: DefaultMenuCategoryDto[];
}

/** Body of POST /api/v1/restaurants/{restaurantId}/menus. */
export interface CreateMenuRequest {
  name: string;
  description: string | null;
}

/** Body of PUT /api/v1/menus/{menuId} — partial update, both fields optional. */
export interface UpdateMenuRequest {
  name?: string;
  description?: string | null;
}

/** Body of PATCH /api/v1/menus/{menuId}/status. */
export interface UpdateMenuStatusRequest {
  isActive: boolean;
}
