import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ActiveRestaurantStateService } from '../../../../../core/services/active-restaurant-state.service';
import { HttpErrorHandlerService } from '../../../../../core/services/http-error-handler.service';
import { LoadingSpinner } from '../../../../../shared/components/loading-spinner/loading-spinner';
import { OrderApiService } from '../../../services/order-api.service';
import { OrderStatusBadge } from '../../../components/order-status-badge/order-status-badge';
import { OrderTypeBadge } from '../../../components/order-type-badge/order-type-badge';
import { OrderStatusProgress } from '../../../components/order-status-progress/order-status-progress';
import { OrderWorkflowActions } from '../../../components/order-workflow-actions/order-workflow-actions';
import type { OrderStatus, StaffOrderDetails } from '../../../models/order.models';

@Component({
  selector: 'app-order-details',
  standalone: true,
  imports: [DatePipe, DecimalPipe, RouterLink, LoadingSpinner, OrderStatusBadge, OrderTypeBadge, OrderStatusProgress, OrderWorkflowActions],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './order-details.html',
  styleUrl: './order-details.css'
})
export class OrderDetails {
  private readonly route = inject(ActivatedRoute);
  private readonly activeRestaurantState = inject(ActiveRestaurantStateService);
  private readonly orderApi = inject(OrderApiService);
  private readonly errors = inject(HttpErrorHandlerService);

  protected readonly restaurant = this.activeRestaurantState.restaurant;
  protected readonly order = signal<StaffOrderDetails | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly updating = signal(false);

  protected readonly orderId = signal<string | null>(this.route.snapshot.paramMap.get('orderId'));

  constructor() {
    effect(() => {
      const restaurant = this.restaurant();
      const orderId = this.orderId();
      if (restaurant && orderId) this.loadOrder(restaurant.id, orderId);
    });
  }

  protected retry(): void {
    const restaurant = this.restaurant();
    const orderId = this.orderId();
    if (restaurant && orderId) this.loadOrder(restaurant.id, orderId);
  }

  protected transitionStatus(status: OrderStatus): void {
    const restaurant = this.restaurant();
    const order = this.order();
    if (!restaurant || !order || this.updating()) return;

    this.updating.set(true);
    this.error.set(null);

    this.orderApi.updateStaffOrderStatus(restaurant.id, order.id, { newStatus: status, notes: null }).subscribe({
      next: response => {
        this.updating.set(false);
        if (!response.success || !response.data) {
          this.error.set(response.message ?? 'The order status could not be updated.');
          return;
        }
        this.order.set(response.data);
      },
      error: error => {
        this.updating.set(false);
        this.error.set(this.errors.handle(error, { fallbackMessage: 'The order status could not be updated.' }).message);
      }
    });
  }

  private loadOrder(restaurantId: string, orderId: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.orderApi.getStaffOrder(restaurantId, orderId).subscribe({
      next: response => {
        this.loading.set(false);
        if (!response.success || !response.data) {
          this.error.set(response.message ?? 'Order details could not be loaded.');
          this.order.set(null);
          return;
        }
        this.order.set(response.data);
      },
      error: error => {
        this.loading.set(false);
        this.error.set(this.errors.handle(error, { fallbackMessage: 'Order details could not be loaded.' }).message);
        this.order.set(null);
      }
    });
  }
}
