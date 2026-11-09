import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { OrderStateService } from '../../services/order-state.service';

@Component({
  selector: 'app-order-summary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './order-summary.html',
  styleUrl: './order-summary.css',
})
export class OrderSummary {
  private readonly orderState = inject(OrderStateService);

  readonly summary = this.orderState.summary;
  readonly loading = this.orderState.summaryLoading;
  readonly error = this.orderState.summaryError;

  readonly cards = computed(() => {
    const data = this.summary();

    return [
      {
        key: 'total-orders',
        label: 'Total Orders',
        value: data ? data.totalOrders : null,
        description: 'All orders',
        icon: 'receipt',
        style: 'slate',
      },
      {
        key: 'pending-kitchen',
        label: 'Pending Kitchen',
        value: data ? data.pendingKitchen : null,
        description: 'Active kitchen pipeline',
        icon: 'chef-hat',
        style: 'blue',
      },
      {
        key: 'completed-today',
        label: 'Completed Today',
        value: data ? data.completedToday : null,
        description: 'Orders fulfilled today',
        icon: 'check-circle',
        style: 'emerald',
      },
      {
        key: 'total-revenue',
        label: 'Total Revenue',
        value: data ? data.totalRevenue : null,
        description: data ? data.currency : 'Revenue',
        icon: 'wallet',
        style: 'orange',
      },
    ] as const;
  });

  refresh(): void {
    const restaurantId = this.orderState.restaurantId();

    if (restaurantId) {
      this.orderState.loadSummary(restaurantId);
    }
  }
}