import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';

import type { ApiResponse } from '../../../core/models/api-response.model';
import type { PagedResult } from '../../../core/models/paged-result.model';

import type {
  CreatePublicOrderRequest,
  CreateDirectPublicOrderRequest,
  CreateStaffOrderRequest,
  PublicCart,
  PublicCartItem,
  PublicMenuDto,
  PublicOrderCreated,
  PublicOrderTracking,
  StaffCreateOrderContext,
  StaffOrderDetails,
  StaffOrderSummary,
  OrderAnalyticsDto,
  UpdateOrderStatusRequest
} from '../models/order.models';

@Injectable({ providedIn: 'root' })
export class OrderApiService {
  private readonly http = inject(HttpClient);

  private readonly publicBaseUrl =
    environment.apiUrl + '/v1/public/restaurants';

  private readonly staffBaseUrl =
    environment.apiUrl + '/restaurants';

  getStaffOrders(
    restaurantId: string,
    status: string | null,
    search: string | null,
    page = 1,
    pageSize = 20
  ): Observable<ApiResponse<PagedResult<StaffOrderDetails>>> {
    let params = new HttpParams()
      .set('page', page)
      .set('pageSize', pageSize);

    if (status) {
      params = params.set('status', status);
    }

    if (search) {
      params = params.set('search', search);
    }

    return this.http.get<
      ApiResponse<PagedResult<StaffOrderDetails>>
    >(
      `${this.staffBaseUrl}/${encodeURIComponent(restaurantId)}/orders`,
      { params }
    );
  }

  getStaffOrder(
    restaurantId: string,
    orderId: string
  ): Observable<ApiResponse<StaffOrderDetails>> {
    return this.http.get<ApiResponse<StaffOrderDetails>>(
      `${this.staffBaseUrl}/${encodeURIComponent(restaurantId)}/orders/${encodeURIComponent(orderId)}`
    );
  }

  updateStaffOrderStatus(
    restaurantId: string,
    orderId: string,
    request: UpdateOrderStatusRequest
  ): Observable<ApiResponse<StaffOrderDetails>> {
    return this.http.patch<ApiResponse<StaffOrderDetails>>(
      `${this.staffBaseUrl}/${encodeURIComponent(restaurantId)}/orders/${encodeURIComponent(orderId)}/status`,
      request
    );
  }

  /**
   * Loads the complete context required by the staff Create Order page.
   *
   * GET /api/restaurants/{restaurantId}/orders/create
   */
  getCreateOrderContext(
    restaurantId: string
  ): Observable<ApiResponse<StaffCreateOrderContext>> {
    return this.http.get<ApiResponse<StaffCreateOrderContext>>(
      `${this.staffBaseUrl}/${encodeURIComponent(restaurantId)}/orders/create`
    );
  }

  getCart(
    slug: string
  ): Observable<ApiResponse<PublicCart>> {
    return this.http.get<ApiResponse<PublicCart>>(
      `${this.publicBaseUrl}/${encodeURIComponent(slug)}/cart`
    );
  }

  /**
   * Loads the published menu for a public site (anonymous customers).
   * GET api/v1/public/sites/{slug}/menu
   */
  getPublicMenu(slug: string): Observable<ApiResponse<PublicMenuDto[]>> {
    return this.http.get<ApiResponse<PublicMenuDto[]>>(
      `${environment.apiUrl}/v1/public/sites/${encodeURIComponent(slug)}/menu`
    );
  }

  addCartItem(
    slug: string,
    menuItemId: string,
    quantity: number
  ): Observable<ApiResponse<PublicCartItem>> {
    return this.http.post<ApiResponse<PublicCartItem>>(
      `${this.publicBaseUrl}/${encodeURIComponent(slug)}/cart/items`,
      {
        menuItemId,
        quantity
      }
    );
  }

  updateCartItem(
    slug: string,
    itemId: string,
    quantity: number
  ): Observable<ApiResponse<PublicCartItem>> {
    return this.http.put<ApiResponse<PublicCartItem>>(
      `${this.publicBaseUrl}/${encodeURIComponent(slug)}/cart/items/${encodeURIComponent(itemId)}`,
      {
        quantity
      }
    );
  }

  removeCartItem(
    slug: string,
    itemId: string
  ): Observable<ApiResponse<object>> {
    return this.http.delete<ApiResponse<object>>(
      `${this.publicBaseUrl}/${encodeURIComponent(slug)}/cart/items/${encodeURIComponent(itemId)}`
    );
  }

  clearCart(
    slug: string
  ): Observable<ApiResponse<object>> {
    return this.http.delete<ApiResponse<object>>(
      `${this.publicBaseUrl}/${encodeURIComponent(slug)}/cart`
    );
  }

  createOrder(
    slug: string,
    request: CreatePublicOrderRequest
  ): Observable<ApiResponse<PublicOrderCreated>> {
    return this.http.post<ApiResponse<PublicOrderCreated>>(
      `${this.publicBaseUrl}/${encodeURIComponent(slug)}/orders`,
      request
    );
  }

  createDirectOrder(
    restaurantId: string,
    request: CreateDirectPublicOrderRequest
  ): Observable<ApiResponse<PublicOrderCreated>> {
    return this.http.post<ApiResponse<PublicOrderCreated>>(
      `${this.publicBaseUrl}/${restaurantId}/orders/direct`,
      request
    );
  }

  /**
   * Creates a staff order for the given restaurant. All financials (prices, tax,
   * subtotal, total) are calculated server-side; the payload carries only item
   * IDs, quantities, customer information, and order type.
   */
  createStaffOrder(
    restaurantId: string,
    request: CreateStaffOrderRequest
  ): Observable<ApiResponse<StaffOrderDetails>> {
    return this.http.post<ApiResponse<StaffOrderDetails>>(
      `${this.staffBaseUrl}/${restaurantId}/orders`,
      request
    );
  }

  trackOrder(
    slug: string,
    trackingToken: string
  ): Observable<ApiResponse<PublicOrderTracking>> {
    return this.http.get<ApiResponse<PublicOrderTracking>>(
      `${this.publicBaseUrl}/${encodeURIComponent(slug)}/orders/track/${encodeURIComponent(trackingToken)}`
    );
  }

  getStaffOrderSummary(
    restaurantId: string,
    startDate?: string | null,
    endDate?: string | null
  ): Observable<ApiResponse<StaffOrderSummary>> {
    let params = new HttpParams();

    if (startDate) {
      params = params.set('startDate', startDate);
    }

    if (endDate) {
      params = params.set('endDate', endDate);
    }

    return this.http.get<ApiResponse<StaffOrderSummary>>(
      `${this.staffBaseUrl}/${encodeURIComponent(restaurantId)}/orders/summary`,
      { params }
    );
  }

  /**
   * Daily order trend (revenue and order volume) for a restaurant within an
   * optional date range. Read-only dashboard analytics.
   */
  getStaffOrderAnalytics(
    restaurantId: string,
    startDate?: string | null,
    endDate?: string | null
  ): Observable<ApiResponse<OrderAnalyticsDto>> {
    let params = new HttpParams();

    if (startDate) {
      params = params.set('startDate', startDate);
    }

    if (endDate) {
      params = params.set('endDate', endDate);
    }

    return this.http.get<ApiResponse<OrderAnalyticsDto>>(
      `${this.staffBaseUrl}/${encodeURIComponent(restaurantId)}/orders/analytics`,
      { params }
    );
  }
}