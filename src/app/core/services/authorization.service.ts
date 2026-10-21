import { computed, inject, Injectable, signal } from '@angular/core';
import { AuthStateService } from './auth-state.service';

export type PermissionMatchMode = 'all' | 'any';

@Injectable({
  providedIn: 'root'
})
export class AuthorizationService {
  private readonly authState = inject(AuthStateService);

  private readonly tenantContextOverride = signal<string | null>(null);

  private readonly effectiveAuthResult = computed(() => {
    const result = this.authState.authResult();

    if (!result) {
      return null;
    }

    const activeTenantId = result.activeTenant?.tenantId ?? null;
    const override = this.tenantContextOverride();

    if (override !== null && override !== activeTenantId) {
      return null;
    }

    return result;
  });

  readonly permissions = computed(
    () => this.effectiveAuthResult()?.permissions ?? []
  );

  readonly activeTenantId = computed(
    () => this.effectiveAuthResult()?.activeTenant?.tenantId ?? null
  );

  readonly isAuthenticated = computed(
    () => this.authState.isAuthenticated() && this.effectiveAuthResult() !== null
  );

  setTenantContext(tenantId: string | null): void {
    this.tenantContextOverride.set(tenantId);
  }

  hasPermission(permission: string): boolean {
    return typeof permission === 'string' &&
      permission.length > 0 &&
      this.permissions().includes(permission);
  }

  hasAllPermissions(permissions: readonly string[]): boolean {
    if (!Array.isArray(permissions) || permissions.length === 0) {
      return false;
    }

    const granted = new Set(this.permissions());

    return permissions.every(
      permission => typeof permission === 'string' &&
        permission.length > 0 &&
        granted.has(permission)
    );
  }

  hasAnyPermission(permissions: readonly string[]): boolean {
    if (!Array.isArray(permissions) || permissions.length === 0) {
      return false;
    }

    const granted = new Set(this.permissions());

    return permissions.some(
      permission => typeof permission === 'string' &&
        permission.length > 0 &&
        granted.has(permission)
    );
  }

  hasPermissions(
    permissions: readonly string[],
    mode: PermissionMatchMode = 'all'
  ): boolean {
    return mode === 'any'
      ? this.hasAnyPermission(permissions)
      : this.hasAllPermissions(permissions);
  }
}
