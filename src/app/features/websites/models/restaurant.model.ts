import type { PagedResult } from '../../../core/models/paged-result.model';
import type { RestaurantDto } from '../../../core/models/restaurant.model';

/**
 * The restaurant DTO is shared by the whole application and is therefore
 * declared once, in the core models. It is re-exported here so the existing
 * feature imports keep working.
 */
export type { RestaurantDto };

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
