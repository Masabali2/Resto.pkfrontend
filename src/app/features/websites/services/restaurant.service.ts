import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type { ApiResponse } from '../../../core/models/api-response.model';
import type { CreateRestaurantRequest, RestaurantDto, RestaurantsPage } from '../models/restaurant.model';

@Injectable({
  providedIn: 'root'
})
export class RestaurantService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/restaurants`;

  getRestaurants(page = 1, pageSize = 100): Observable<ApiResponse<RestaurantsPage>> {
    const params = new HttpParams()
      .set('page', page)
      .set('pageSize', pageSize);

    return this.http.get<ApiResponse<RestaurantsPage>>(
      this.apiUrl,
      { params }
    );
  }

  /**
   * Creates a restaurant for the active tenant. The backend derives the
   * tenant from the authenticated session; no tenantId is ever sent.
   */
  createRestaurant(request: CreateRestaurantRequest): Observable<ApiResponse<RestaurantDto>> {
    return this.http.post<ApiResponse<RestaurantDto>>(
      this.apiUrl,
      request
    );
  }
}
