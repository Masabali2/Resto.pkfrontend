import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ActiveRestaurantStateService } from '../../../../../core/services/active-restaurant-state.service';
import { AuthorizationService } from '../../../../../core/services/authorization.service';
import { PERMISSIONS } from '../../../../../core/models/permissions';
import { LoadingSpinner } from '../../../../../shared/components/loading-spinner/loading-spinner';
import { OrderStatusBadge } from '../../../components/order-status-badge/order-status-badge';
import { OrderStatusProgress } from '../../../components/order-status-progress/order-status-progress';
import { OrderTypeBadge } from '../../../components/order-type-badge/order-type-badge';
import { OrderWorkflowActions } from '../../../components/order-workflow-actions/order-workflow-actions';
import { OrderStateService } from '../../../services/order-state.service';
import type { OrderStatus } from '../../../models/order.models';

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
  private readonly authorization = inject(AuthorizationService);
  private readonly orderState = inject(OrderStateService);
  private readonly routeParams = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap
  });

  protected readonly restaurant = this.activeRestaurantState.restaurant;
  protected readonly order = this.orderState.selectedOrder;
  protected readonly loading = this.orderState.detailLoading;
  protected readonly error = this.orderState.detailMessage;
  protected readonly updating = this.orderState.updatingStatus;
  protected readonly canUpdateOrder = computed(() =>
    this.authorization.hasPermission(PERMISSIONS.Order.Update)
  );
  protected readonly canCancelOrder = computed(() =>
    this.authorization.hasPermission(PERMISSIONS.Order.Cancel)
  );
  protected readonly orderId = computed(() => this.routeParams().get('orderId'));

  constructor() {
    effect(() => {
      const restaurant = this.restaurant();
      const orderId = this.orderId();
      if (restaurant && orderId) {
        untracked(() => this.orderState.loadOrder(restaurant.id, orderId));
      } else {
        untracked(() => this.orderState.clear());
      }
    });
  }

  protected retry(): void {
    const restaurant = this.restaurant();
    const orderId = this.orderId();
    if (restaurant && orderId) this.orderState.loadOrder(restaurant.id, orderId);
  }

  protected transitionStatus(status: OrderStatus): void {
    const restaurantId = this.restaurant()?.id;
    if (
      restaurantId &&
      this.canUpdateOrder() &&
      (status !== 'Cancelled' || this.canCancelOrder())
    ) {
      this.orderState.transitionStatus(restaurantId, status);
    }
  }
}