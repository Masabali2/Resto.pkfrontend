
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { ApiResponse } from '../models/api-response.model';
import type {
  CreateRestaurantRequest,
  RestaurantDto
} from '../models/restaurant.model';

@Injectable({
  providedIn: 'root'
})
export class RestaurantService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/restaurants`;

  createRestaurant(
    request: CreateRestaurantRequest
  ): Observable<ApiResponse<RestaurantDto>> {
    return this.http.post<ApiResponse<RestaurantDto>>(
      this.apiUrl,
      request
    );
  }
}
