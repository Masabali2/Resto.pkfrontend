
export interface CreateTenantRequest {
  name: string;
  slug: string;
}

export interface TenantDto {
  id: string;
  name: string;
  slug: string;
  status: string;
  createdAt: string;
}

export interface TenantAdminDto {
  id: string;
  name: string;
  slug: string;
  status: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface UpdateTenantRequest {
  name: string;
}

export interface UpdateTenantStatusRequest {
  status: string;
}
