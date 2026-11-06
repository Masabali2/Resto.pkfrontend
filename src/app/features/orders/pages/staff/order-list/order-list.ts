import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ActiveRestaurantStateService } from '../../../../../core/services/active-restaurant-state.service';
import { HttpErrorHandlerService } from '../../../../../core/services/http-error-handler.service';
import { LoadingSpinner } from '../../../../../shared/components/loading-spinner/loading-spinner';
import { OrderApiService } from '../../../services/order-api.service';
import { OrderStatusBadge } from '../../../components/order-status-badge/order-status-badge';
import type { OrderStatus, StaffOrderDetails } from '../../../models/order.models';

const ORDER_STATUSES = ['All orders', 'New', 'Confirmed', 'Preparing', 'Ready', 'Completed', 'Cancelled'] as const;
type OrderStatusFilter = (typeof ORDER_STATUSES)[number];

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
  private readonly orderApi = inject(OrderApiService);
  private readonly errors = inject(HttpErrorHandlerService);

  protected readonly statuses = ORDER_STATUSES;
  protected readonly selectedStatus = signal<OrderStatusFilter>('All orders');
  protected readonly restaurant = this.activeRestaurantState.restaurant;
  protected readonly restaurantState = this.activeRestaurantState.state;
  protected readonly restaurantError = this.activeRestaurantState.errorMessage;
  protected readonly orders = signal<StaffOrderDetails[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly page = signal(1);
  protected readonly pageSize = 20;
  protected readonly totalPages = signal(1);
  protected readonly totalCount = signal(0);

  constructor() {
    effect(() => {
      if (this.restaurant()?.id) untracked(() => this.loadOrders());
    });
  }

  protected selectStatus(status: OrderStatusFilter): void {
    this.selectedStatus.set(status);
    this.page.set(1);
    this.loadOrders();
  }

  protected retryOrders(): void { this.loadOrders(); }
  protected retryRestaurantLoad(): void { this.activeRestaurantState.refresh(); }

  protected previousPage(): void {
    if (this.page() <= 1) return;
    this.page.update(value => value - 1);
    this.loadOrders();
  }

  protected nextPage(): void {
    if (this.page() >= this.totalPages()) return;
    this.page.update(value => value + 1);
    this.loadOrders();
  }

  private loadOrders(): void {
    const restaurant = this.restaurant();
    if (!restaurant) return;

    this.loading.set(true);
    this.error.set(null);
    const status = this.selectedStatus() === 'All orders' ? null : this.selectedStatus() as OrderStatus;

    this.orderApi.getStaffOrders(restaurant.id, status, this.page(), this.pageSize).subscribe({
      next: response => {
        this.loading.set(false);
        if (!response.success || !response.data) {
          this.error.set(response.message ?? 'Orders could not be loaded.');
          this.orders.set([]);
          return;
        }
        this.orders.set(response.data.items);
        this.totalPages.set(Math.max(1, response.data.totalPages));
        this.totalCount.set(response.data.totalCount);
      },
      error: error => {
        this.loading.set(false);
        this.error.set(this.errors.handle(error, { fallbackMessage: 'Orders could not be loaded.' }).message);
        this.orders.set([]);
      }
    });
  }
}
