/**
 * Mirrors backend MenuItemDto / create / update / availability / status requests
 * (RestaurantSaaS.Application/Features/MenuItems/DTOs/MenuItemDtos.cs).
 */
export interface MenuItemDto {
  id: string;
  menuCategoryId: string;
  menuId: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  imageFileId: string | null;
  displayOrder: number;
  isAvailable: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
}

/** Body of POST /api/v1/menu-categories/{categoryId}/items. */
export interface CreateMenuItemRequest {
  name: string;
  price: number;
  description: string | null;
  currency: string | null;
  imageFileId: string | null;
  displayOrder: number | null;
}

/**
 * Body of PUT /api/v1/menu-items/{itemId} — partial update.
 * `clearImage` and `imageFileId` are mutually exclusive on the backend;
 * image upload is not implemented client-side (BT2) so this field is not in
 * the item form, but it is kept in the type for completeness.
 */
export interface UpdateMenuItemRequest {
  name?: string;
  description?: string | null;
  price?: number | null;
  currency?: string | null;
  imageFileId: string | null;
  clearImage: boolean;
  displayOrder: number | null;
}

/** Body of PATCH /api/v1/menu-items/{itemId}/availability. */
export interface UpdateMenuItemAvailabilityRequest {
  isAvailable: boolean;
}

/** Body of PATCH /api/v1/menu-items/{itemId}/status. */
export interface UpdateMenuItemStatusRequest {
  isActive: boolean;
}
