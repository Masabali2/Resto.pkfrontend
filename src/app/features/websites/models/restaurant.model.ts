import type { PagedResult } from './paged-result.model';

/** Mirrors backend RestaurantDto (RestaurantDtos.cs). Address fields are flattened. */
export interface RestaurantDto {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  phone: string | null;
  email: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  country: string;
  timeZone: string;
  status: string;
  createdAt: string;
  updatedAt: string | null;
}

export type RestaurantsPage = PagedResult<RestaurantDto>;

/** Mirrors backend AddressInput record. */
export interface RestaurantAddressInput {
  line1: string;
  line2: string | null;
  city: string;
  country: string;
  postalCode: string | null;
}

/**
 * Body of POST /api/restaurants. Mirrors the backend CreateRestaurantRequest
 * record exactly. No tenantId: the backend derives the tenant from the
 * authenticated session. Optional strings are sent as null when empty.
 */
export interface CreateRestaurantRequest {
  name: string;
  description: string | null;
  phone: string | null;
  email: string | null;
  address: RestaurantAddressInput;
  timeZone: string | null;
}
