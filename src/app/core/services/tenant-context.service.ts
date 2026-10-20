import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpContext, HttpContextToken } from '@angular/common/http';
import {
  finalize,
  Observable,
  of,
  switchMap,
  tap
} from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthStateService } from './auth-state.service';
import type { ApiResponse } from '../models/api-response.model';
import type { AuthResult, TenantSummary } from '../models/auth.model';

export const SKIP_TENANT_HEADER = new HttpContextToken<boolean>(() => false);

/**
 * Owns the active-tenant context for tenant-scoped API calls. The session's
 * `activeTenant` from AuthStateService is the single source of truth; a
 * successful switch replaces it atomically and refreshes permissions via
 * GET /Auth/me so stale grants from the previous tenant never survive.
 */
@Injectable({ providedIn: 'root' })
export class TenantContextService {
  private readonly http = inject(HttpClient);
  private readonly authState = inject(AuthStateService);

  private readonly switchingState = signal(false);

  readonly switching = this.switchingState.asReadonly();

  readonly activeTenantId = computed(
    () => this.authState.authResult()?.activeTenant?.tenantId ?? null
  );

  readonly memberships = computed(
    () => this.authState.authResult()?.memberships ?? []
  );

  readonly canSwitchTenants = computed(() => this.memberships().length > 1);

  switchTenant(tenantId: string): Observable<ApiResponse<TenantSummary>> {
    return this.http.post<ApiResponse<TenantSummary>>(
      `${environment.apiUrl}/tenants/${tenantId}/switch`,
      {},
      { context: new HttpContext().set(SKIP_TENANT_HEADER, true) }
    ).pipe(
      tap(response => {
        if (response.success && response.data) {
          this.applyActiveTenant(response.data);
        }
      })
    );
  }

  refreshSession(): Observable<ApiResponse<AuthResult>> {
    return this.http.get<ApiResponse<AuthResult>>(
      `${environment.apiUrl}/Auth/me`
    ).pipe(
      tap(response => {
        if (response.success && response.data) {
          this.authState.setAuthResult(response.data);
        }
      })
    );
  }

  switchAndRefresh(tenantId: string): Observable<ApiResponse<AuthResult> | null> {
    this.switchingState.set(true);

    return this.switchTenant(tenantId).pipe(
      switchMap(switchResponse => {
        if (!switchResponse.success || !switchResponse.data) {
          return of(null);
        }

        return this.refreshSession();
      }),
      finalize(() => this.switchingState.set(false))
    );
  }

  private applyActiveTenant(activeTenant: TenantSummary): void {
    const current = this.authState.authResult();

    if (!current) {
      return;
    }

    this.authState.setAuthResult({
      ...current,
      activeTenant
    });
  }
}
