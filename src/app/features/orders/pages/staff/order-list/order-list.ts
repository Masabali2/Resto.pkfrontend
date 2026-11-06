import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal
} from '@angular/core';
import { ActiveRestaurantStateService } from '../../../../../core/services/active-restaurant-state.service';
import { LoadingSpinner } from '../../../../../shared/components/loading-spinner/loading-spinner';

const ORDER_STATUSES = [
  'All orders',
  'New',
  'Confirmed',
  'Preparing',
  'Ready',
  'Completed',
  'Cancelled'
] as const;

type OrderStatusFilter = (typeof ORDER_STATUSES)[number];

@Component({
  selector: 'app-order-list',
  standalone: true,
  imports: [LoadingSpinner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './order-list.html',
  styleUrl: './order-list.css'
})
export class OrderList {
  private readonly activeRestaurantState = inject(ActiveRestaurantStateService);

  protected readonly statuses = ORDER_STATUSES;
  protected readonly selectedStatus = signal<OrderStatusFilter>('All orders');
  protected readonly restaurant = this.activeRestaurantState.restaurant;
  protected readonly restaurantState = this.activeRestaurantState.state;
  protected readonly restaurantError = this.activeRestaurantState.errorMessage;

  protected readonly emptyMessage = computed(() => {
    if (this.selectedStatus() === 'All orders') {
      return 'Order data will appear here when the order service is connected.';
    }

    return `The ${this.selectedStatus().toLowerCase()} order view will be available when order data is connected.`;
  });

  protected selectStatus(status: OrderStatusFilter): void {
    this.selectedStatus.set(status);
  }

  protected retryRestaurantLoad(): void {
    this.activeRestaurantState.refresh();
  }
}
