/**
 * Mirrors backend MenuCategoryDto / create / update / status / reorder requests
 * (RestaurantSaaS.Application/Features/MenuCategories/DTOs/MenuCategoryDtos.cs).
 */
export interface MenuCategoryDto {
  id: string;
  menuId: string;
  name: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
  itemCount: number;
}

/** Body of POST /api/v1/menus/{menuId}/categories. */
export interface CreateMenuCategoryRequest {
  name: string;
  description: string | null;
  displayOrder: number | null;
}

/** Body of PUT /api/v1/menu-categories/{categoryId} — partial update. */
export interface UpdateMenuCategoryRequest {
  name?: string;
  description?: string | null;
  displayOrder?: number | null;
}

/** Body of PATCH /api/v1/menu-categories/{categoryId}/status. */
export interface UpdateMenuCategoryStatusRequest {
  isActive: boolean;
}

/**
 * Body of PATCH /api/v1/menus/{menuId}/categories/order — must contain every
 * category id exactly once (D7).
 */
export interface ReorderMenuCategoriesRequest {
  orderedCategoryIds: string[];
}
