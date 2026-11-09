
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal
} from '@angular/core';

import { ActiveRestaurantStateService } from '../../../../core/services/active-restaurant-state.service';
import { OrderSummary } from '../../components/order-summary/order-summary';
import {
  StaffOrderHeader,
  type StaffOrderViewMode
} from '../../components/staff-order-header/staff-order-header';

import { OrderList } from '../staff/order-list/order-list';
import { OrderStateService } from '../../services/order-state.service';

@Component({
  selector: 'app-order-management',
  standalone: true,
  imports: [
    StaffOrderHeader,
    OrderList,
    OrderSummary
  ],
  templateUrl: './order-management.html',
  styleUrl: './order-management.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrderManagement {
  private readonly activeRestaurantState =
    inject(ActiveRestaurantStateService);

  private readonly orderState =
    inject(OrderStateService);

  protected readonly restaurant =
    this.activeRestaurantState.restaurant;

  protected readonly restaurantState =
    this.activeRestaurantState.state;

  protected readonly restaurantError =
    this.activeRestaurantState.errorMessage;

  protected readonly searchTerm = signal('');

  protected readonly viewMode =
    signal<StaffOrderViewMode>('table');

  protected readonly createOrderMessage =
    signal<string | null>(null);

  // Automatically load the summary when the active restaurant changes.
  private readonly summaryEffect = effect(() => {
    const activeRestaurant = this.restaurant();

    if (!activeRestaurant) {
      return;
    }

    this.orderState.loadSummary(activeRestaurant.id);
  });

  protected onSearchChange(value: string): void {
    this.searchTerm.set(value);
  }

  protected onViewModeChange(mode: StaffOrderViewMode): void {
    this.viewMode.set(mode);
  }

  protected onCreateOrder(): void {
    this.createOrderMessage.set(
      'The staff create-order screen is not available yet.'
    );
  }

  protected dismissMessage(): void {
    this.createOrderMessage.set(null);
  }

  protected retryRestaurantLoad(): void {
    this.activeRestaurantState.refresh();
  }
}
