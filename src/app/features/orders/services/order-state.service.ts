
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { HttpErrorHandlerService } from '../../../core/services/http-error-handler.service';
import type {
  OrderStatus,
  StaffOrderDetails,
  StaffOrderSummary
} from '../models/order.models';
import { OrderApiService } from './order-api.service';

export type OrderStatusFilter = OrderStatus | 'All orders';

const PAGE_SIZE = 20;

@Injectable({ providedIn: 'root' })
export class OrderStateService {
  private readonly orderApi = inject(OrderApiService);
  private readonly errors = inject(HttpErrorHandlerService);
  private readonly destroyRef = inject(DestroyRef);

  // Restaurant scope
  private readonly restaurantIdState = signal<string | null>(null);

  // Order list
  private readonly ordersState = signal<StaffOrderDetails[]>([]);
  private readonly statusFilterState =
    signal<OrderStatusFilter>('All orders');
  private readonly pageState = signal(1);
  private readonly totalPagesState = signal(1);
  private readonly totalCountState = signal(0);

  // Selected order
  private readonly selectedOrderState =
    signal<StaffOrderDetails | null>(null);

  // Summary
  private readonly summaryState =
    signal<StaffOrderSummary | null>(null);

  // Loading states
  private readonly listLoadingState = signal(false);
  private readonly detailLoadingState = signal(false);
  private readonly updatingStatusState = signal(false);
  private readonly summaryLoadingState = signal(false);

  // Error states
  private readonly listErrorState = signal<string | null>(null);
  private readonly detailErrorState = signal<string | null>(null);
  private readonly workflowErrorState = signal<string | null>(null);
  private readonly summaryErrorState = signal<string | null>(null);

  // Request identifiers prevent stale responses from updating state.
  private listRequestId = 0;
  private detailRequestId = 0;
  private updateRequestId = 0;
  private summaryRequestId = 0;

  // Public readonly state
  readonly restaurantId = this.restaurantIdState.asReadonly();

  readonly orders = this.ordersState.asReadonly();
  readonly selectedOrder = this.selectedOrderState.asReadonly();

  readonly statusFilter = this.statusFilterState.asReadonly();

  readonly page = this.pageState.asReadonly();
  readonly pageSize = PAGE_SIZE;
  readonly totalPages = this.totalPagesState.asReadonly();
  readonly totalCount = this.totalCountState.asReadonly();

  readonly summary = this.summaryState.asReadonly();

  readonly listLoading = this.listLoadingState.asReadonly();
  readonly detailLoading = this.detailLoadingState.asReadonly();
  readonly updatingStatus = this.updatingStatusState.asReadonly();
  readonly summaryLoading = this.summaryLoadingState.asReadonly();

  readonly listError = this.listErrorState.asReadonly();
  readonly detailError = this.detailErrorState.asReadonly();
  readonly workflowError = this.workflowErrorState.asReadonly();
  readonly summaryError = this.summaryErrorState.asReadonly();

  readonly detailMessage = computed(
    () => this.workflowErrorState() ?? this.detailErrorState()
  );

  // Clear all state when leaving the restaurant workspace.
  clear(): void {
    this.restaurantIdState.set(null);

    this.invalidateRequests();
    this.resetState();
  }

  // Load dashboard summary.
  loadSummary(restaurantId: string): void {
    this.ensureRestaurantScope(restaurantId);

    const requestId = ++this.summaryRequestId;

    this.summaryLoadingState.set(true);
    this.summaryErrorState.set(null);

    this.orderApi.getStaffOrderSummary(restaurantId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => {
          if (requestId !== this.summaryRequestId) return;

          this.summaryLoadingState.set(false);

          if (!response.success || !response.data) {
            this.summaryState.set(null);
            this.summaryErrorState.set(
              response.message ?? 'Order summary could not be loaded.'
            );
            return;
          }

          this.summaryState.set(response.data);
        },

        error: error => {
          if (requestId !== this.summaryRequestId) return;

          this.summaryLoadingState.set(false);
          this.summaryState.set(null);

          this.summaryErrorState.set(
            this.errors.handle(error, {
              fallbackMessage: 'Order summary could not be loaded.'
            }).message
          );
        }
      });
  }

  // Load paginated orders.
  loadOrders(restaurantId: string): void {
    this.ensureRestaurantScope(restaurantId);

    const requestId = ++this.listRequestId;

    const status = this.statusFilterState() === 'All orders'
      ? null
      : this.statusFilterState();

    this.listLoadingState.set(true);
    this.listErrorState.set(null);

    this.orderApi.getStaffOrders(
      restaurantId,
      status,
      this.pageState(),
      PAGE_SIZE
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => {
          if (requestId !== this.listRequestId) return;

          this.listLoadingState.set(false);

          if (!response.success || !response.data) {
            this.ordersState.set([]);
            this.totalCountState.set(0);
            this.totalPagesState.set(1);

            this.listErrorState.set(
              response.message ?? 'Orders could not be loaded.'
            );
            return;
          }

          this.ordersState.set(response.data.items);
          this.totalCountState.set(response.data.totalCount);
          this.totalPagesState.set(
            Math.max(1, response.data.totalPages)
          );
        },

        error: error => {
          if (requestId !== this.listRequestId) return;

          this.listLoadingState.set(false);
          this.ordersState.set([]);
          this.totalCountState.set(0);
          this.totalPagesState.set(1);

          this.listErrorState.set(
            this.errors.handle(error, {
              fallbackMessage: 'Orders could not be loaded.'
            }).message
          );
        }
      });
  }

  // Change order status filter.
  setStatusFilter(
    restaurantId: string,
    status: OrderStatusFilter
  ): void {
    this.ensureRestaurantScope(restaurantId);

    this.statusFilterState.set(status);
    this.pageState.set(1);

    this.loadOrders(restaurantId);
  }

  // Navigate to previous page.
  previousPage(restaurantId: string): void {
    if (
      this.restaurantIdState() !== restaurantId ||
      this.pageState() <= 1
    ) {
      return;
    }

    this.pageState.update(page => page - 1);
    this.loadOrders(restaurantId);
  }

  // Navigate to next page.
  nextPage(restaurantId: string): void {
    if (
      this.restaurantIdState() !== restaurantId ||
      this.pageState() >= this.totalPagesState()
    ) {
      return;
    }

    this.pageState.update(page => page + 1);
    this.loadOrders(restaurantId);
  }

  // Load individual order details.
  loadOrder(restaurantId: string, orderId: string): void {
    this.ensureRestaurantScope(restaurantId);

    this.updateRequestId++;
    this.updatingStatusState.set(false);

    const requestId = ++this.detailRequestId;

    this.detailLoadingState.set(true);
    this.detailErrorState.set(null);
    this.workflowErrorState.set(null);

    if (this.selectedOrderState()?.id !== orderId) {
      this.selectedOrderState.set(null);
    }

    this.orderApi.getStaffOrder(restaurantId, orderId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => {
          if (requestId !== this.detailRequestId) return;

          this.detailLoadingState.set(false);

          if (!response.success || !response.data) {
            this.selectedOrderState.set(null);
            this.detailErrorState.set(
              response.message ?? 'Order details could not be loaded.'
            );
            return;
          }

          this.selectedOrderState.set(response.data);
        },

        error: error => {
          if (requestId !== this.detailRequestId) return;

          this.detailLoadingState.set(false);
          this.selectedOrderState.set(null);

          this.detailErrorState.set(
            this.errors.handle(error, {
              fallbackMessage: 'Order details could not be loaded.'
            }).message
          );
        }
      });
  }

  // Transition selected order status.
  transitionStatus(
    restaurantId: string,
    status: OrderStatus
  ): void {
    const order = this.selectedOrderState();

    if (
      !order ||
      this.restaurantIdState() !== restaurantId ||
      this.updatingStatusState()
    ) {
      return;
    }

    const requestId = ++this.updateRequestId;

    this.updatingStatusState.set(true);
    this.workflowErrorState.set(null);

    this.orderApi.updateStaffOrderStatus(
      restaurantId,
      order.id,
      {
        newStatus: status,
        notes: null
      }
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => {
          if (requestId !== this.updateRequestId) return;

          this.updatingStatusState.set(false);

          if (!response.success || !response.data) {
            this.workflowErrorState.set(
              response.message ??
              'The order status could not be updated.'
            );
            return;
          }

          this.listRequestId++;
          this.listLoadingState.set(false);

          this.selectedOrderState.set(response.data);

          // Synchronize the current list with the updated order.
          this.syncOrderList(response.data, restaurantId);

          // Refresh dashboard statistics.
          this.loadSummary(restaurantId);
        },

        error: error => {
          if (requestId !== this.updateRequestId) return;

          this.updatingStatusState.set(false);

          this.workflowErrorState.set(
            this.errors.handle(error, {
              fallbackMessage: 'The order status could not be updated.'
            }).message
          );
        }
      });
  }

  // Ensure all data belongs to the active restaurant.
  private ensureRestaurantScope(restaurantId: string): void {
    if (this.restaurantIdState() === restaurantId) return;

    this.restaurantIdState.set(restaurantId);

    this.invalidateRequests();
    this.resetState();
  }

  // Invalidate pending requests.
  private invalidateRequests(): void {
    this.listRequestId++;
    this.detailRequestId++;
    this.updateRequestId++;
    this.summaryRequestId++;
  }

  // Reset all restaurant-specific state.
  private resetState(): void {
    this.ordersState.set([]);
    this.selectedOrderState.set(null);

    this.statusFilterState.set('All orders');

    this.pageState.set(1);
    this.totalPagesState.set(1);
    this.totalCountState.set(0);

    this.summaryState.set(null);

    this.listLoadingState.set(false);
    this.detailLoadingState.set(false);
    this.updatingStatusState.set(false);
    this.summaryLoadingState.set(false);

    this.listErrorState.set(null);
    this.detailErrorState.set(null);
    this.workflowErrorState.set(null);
    this.summaryErrorState.set(null);
  }

  // Keep the currently loaded list synchronized after status changes.
  private syncOrderList(
    order: StaffOrderDetails,
    restaurantId: string
  ): void {
    if (this.restaurantIdState() !== restaurantId) return;

    const currentOrders = this.ordersState();

    const orderIndex = currentOrders.findIndex(
      item => item.id === order.id
    );

    if (orderIndex < 0) return;

    const filter = this.statusFilterState();

    if (filter === 'All orders' || filter === order.status) {
      this.ordersState.update(items =>
        items.map(item => item.id === order.id ? order : item)
      );

      return;
    }

    // The updated order no longer matches the selected filter.
    const nextOrders = currentOrders.filter(
      item => item.id !== order.id
    );

    const nextCount = Math.max(
      0,
      this.totalCountState() - 1
    );

    const nextTotalPages = Math.max(
      1,
      Math.ceil(nextCount / PAGE_SIZE)
    );

    this.ordersState.set(nextOrders);
    this.totalCountState.set(nextCount);
    this.totalPagesState.set(nextTotalPages);

    if (this.pageState() > nextTotalPages) {
      this.pageState.set(nextTotalPages);
    }

    this.loadOrders(restaurantId);
  }
}
