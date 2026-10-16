
export interface LoginRequest {
  emailOrUserName: string;
  password: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  userName: string;
  platformRoles: string[];
}

export interface TenantSummary {
  tenantId: string;
  name: string;
  slug: string;
  roleName: string;
}

export interface AuthResult {
  user: AuthenticatedUser;
  memberships: TenantSummary[];
  activeTenant: TenantSummary | null;
  permissions: string[];
}
export interface RegisterRequest {
  email: string;
  userName: string;
  password: string;
  confirmPassword: string;
}
