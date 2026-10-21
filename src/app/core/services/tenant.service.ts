
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { ApiResponse } from '../models/api-response.model';
import type { TenantSummary } from '../models/auth.model';
import { HttpContext } from '@angular/common/http';
import { SKIP_TENANT_HEADER } from './tenant-context.service';
import type {
  CreateTenantRequest,
  TenantAdminDto
} from '../models/tenant.model';

@Injectable({
  providedIn: 'root'
})
export class TenantService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/tenants`;

  getMyMemberships(): Observable<ApiResponse<TenantSummary[]>> {
    return this.http.get<ApiResponse<TenantSummary[]>>(
      `${this.apiUrl}/mine`
    );
  }

  createTenant(
    request: CreateTenantRequest
  ): Observable<ApiResponse<TenantAdminDto>> {
    return this.http.post<ApiResponse<TenantAdminDto>>(
      this.apiUrl,
      request
    );
  }

 switchTenant(
  tenantId: string
): Observable<ApiResponse<TenantSummary>> {
  return this.http.post<ApiResponse<TenantSummary>>(
    `${this.apiUrl}/${tenantId}/switch`,
    {},
    {
      context: new HttpContext().set(SKIP_TENANT_HEADER, true)
    }
  );
}
}
