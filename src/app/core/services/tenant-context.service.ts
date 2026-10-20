import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthStateService } from './auth-state.service';
import { AuthorizationService } from './authorization.service';
import type { ApiResponse } from '../models/api-response.model';
import type { AuthResult, TenantSummary } from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class TenantContextService {
  private readonly http = inject(HttpClient);
  private readonly authState = inject(AuthStateService);
  private readonly authorization = inject(AuthorizationService);

  private readonly activeTenantIdState = signal<string | null>(null);

  readonly activeTenantId = this.activeTenantIdState.asReadonly();

  readonly memberships = computed(
    () => this.authState.authResult()?.memberships ?? []
  );

  readonly canSwitchTenants = computed(() => this.memberships().length > 1);

  constructor() {
    this.authorization.activeTenantId.subscribe(tenantId => {
      this.activeTenantIdState.set(tenantId);
    });
  }

  switchTenant(tenantId: string): Observable<ApiResponse<TenantSummary>> {
    return this.http.post<ApiResponse<TenantSummary>>(
      `${environment.apiUrl}/tenants/${tenantId}/switch`,
      {}
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
