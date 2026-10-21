import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type { ApiResponse } from '../../../core/models/api-response.model';
import type { PagedResult } from '../../websites/models/paged-result.model';

export interface StaffMemberDto {
  membershipId: string;
  userId: string;
  email: string;
  userName: string | null;
  roleName: string;
  status: string;
  joinedAt: string;
  createdAt: string;
}

export type StaffPage = PagedResult<StaffMemberDto>;

@Injectable({ providedIn: 'root' })
export class StaffService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/staff`;

  getStaff(page = 1, pageSize = 20): Observable<ApiResponse<StaffPage>> {
    const params = new HttpParams()
      .set('page', page)
      .set('pageSize', pageSize);

    return this.http.get<ApiResponse<StaffPage>>(this.apiUrl, { params });
  }
}
