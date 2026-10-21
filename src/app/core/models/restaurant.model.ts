
export interface CreateRestaurantRequest {
  name: string;
  description: string | null;
  phone: string | null;
  email: string | null;
  address: AddressInput;
  timeZone: string | null;
}

export interface UpdateRestaurantRequest {
  name: string | null;
  description: string | null;
  phone: string | null;
  email: string | null;
  address: AddressInput | null;
  timeZone: string | null;
}

export interface AddressInput {
  line1: string;
  line2: string | null;
  city: string;
  country: string;
  postalCode: string | null;
}

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

export interface UpdateRestaurantStatusRequest {
  status: string;
}
