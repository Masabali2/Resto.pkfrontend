
import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { ApiResponse } from '../models/api-response.model';
import type { PagedResult } from '../models/paged-result.model';
import type {
  CreateRestaurantRequest,
  RestaurantDto
} from '../models/restaurant.model';

/**
 * Restaurant transport of the application.
 *
 * Every call is tenant scoped: the tenant is taken from the active session by
 * the tenant interceptor, so no tenant id is ever sent in a body or a query
 * parameter. The service only moves data; it owns no selection logic.
 */
@Injectable({
  providedIn: 'root'
})
export class RestaurantService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/restaurants`;

  /** GET restaurants?page=&pageSize= — the restaurants of the active tenant. */
  getRestaurants(
    page = 1,
    pageSize = 100
  ): Observable<ApiResponse<PagedResult<RestaurantDto>>> {
    const params = new HttpParams()
      .set('page', page)
      .set('pageSize', pageSize);

    return this.http.get<ApiResponse<PagedResult<RestaurantDto>>>(
      this.apiUrl,
      { params }
    );
  }

  /** GET restaurants/{restaurantId} — the detail of a single restaurant. */
  getRestaurantById(
    restaurantId: string
  ): Observable<ApiResponse<RestaurantDto>> {
    return this.http.get<ApiResponse<RestaurantDto>>(
      `${this.apiUrl}/${restaurantId}`
    );
  }

  createRestaurant(
    request: CreateRestaurantRequest
  ): Observable<ApiResponse<RestaurantDto>> {
    return this.http.post<ApiResponse<RestaurantDto>>(
      this.apiUrl,
      request
    );
  }
}
