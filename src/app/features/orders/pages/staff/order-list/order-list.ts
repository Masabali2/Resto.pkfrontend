import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ActiveRestaurantStateService } from '../../../../../core/services/active-restaurant-state.service';
import { LoadingSpinner } from '../../../../../shared/components/loading-spinner/loading-spinner';
import { OrderStatusBadge } from '../../../components/order-status-badge/order-status-badge';
import { OrderStateService, type OrderStatusFilter } from '../../../services/order-state.service';

const ORDER_STATUSES: readonly OrderStatusFilter[] = [
  'All orders',
  'New',
  'Confirmed',
  'Preparing',
  'Ready',
  'Completed',
  'Cancelled'
];

@Component({
  selector: 'app-order-list',
  standalone: true,
  imports: [DatePipe, DecimalPipe, RouterLink, LoadingSpinner, OrderStatusBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './order-list.html',
  styleUrl: './order-list.css'
})
export class OrderList {
  private readonly activeRestaurantState = inject(ActiveRestaurantStateService);
  private readonly orderState = inject(OrderStateService);

  protected readonly statuses = ORDER_STATUSES;
  protected readonly restaurant = this.activeRestaurantState.restaurant;
  protected readonly restaurantState = this.activeRestaurantState.state;
  protected readonly restaurantError = this.activeRestaurantState.errorMessage;
  protected readonly orders = this.orderState.orders;
  protected readonly selectedStatus = this.orderState.statusFilter;
  protected readonly loading = this.orderState.listLoading;
  protected readonly error = this.orderState.listError;
  protected readonly page = this.orderState.page;
  protected readonly pageSize = this.orderState.pageSize;
  protected readonly totalPages = this.orderState.totalPages;
  protected readonly totalCount = this.orderState.totalCount;

  constructor() {
    effect(() => {
      const restaurantId = this.restaurant()?.id;
      if (restaurantId) {
        untracked(() => this.orderState.loadOrders(restaurantId));
      } else {
        untracked(() => this.orderState.clear());
      }
    });
  }

  protected selectStatus(status: OrderStatusFilter): void {
    const restaurantId = this.restaurant()?.id;
    if (restaurantId) this.orderState.setStatusFilter(restaurantId, status);
  }

  protected retryOrders(): void {
    const restaurantId = this.restaurant()?.id;
    if (restaurantId) this.orderState.loadOrders(restaurantId);
  }

  protected retryRestaurantLoad(): void {
    this.activeRestaurantState.refresh();
  }

  protected previousPage(): void {
    const restaurantId = this.restaurant()?.id;
    if (restaurantId) this.orderState.previousPage(restaurantId);
  }

  protected nextPage(): void {
    const restaurantId = this.restaurant()?.id;
    if (restaurantId) this.orderState.nextPage(restaurantId);
  }
}