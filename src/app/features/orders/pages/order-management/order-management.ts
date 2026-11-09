
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal
} from '@angular/core';

import { ActiveRestaurantStateService } from '../../../../core/services/active-restaurant-state.service';

import {
  StaffOrderHeader,
  type StaffOrderViewMode
} from '../../components/staff-order-header/staff-order-header';

import { OrderList } from '../staff/order-list/order-list';

@Component({
  selector: 'app-order-management',
  standalone: true,
  imports: [
    StaffOrderHeader,
    OrderList
  ],
  templateUrl: './order-management.html',
  styleUrl: './order-management.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrderManagement {
  private readonly activeRestaurantState =
    inject(ActiveRestaurantStateService);

  protected readonly restaurant =
    this.activeRestaurantState.restaurant;

  // Add these three members for the HTML template.
  protected readonly restaurantState =
    this.activeRestaurantState.state;

  protected readonly restaurantError =
    this.activeRestaurantState.errorMessage;

  protected readonly searchTerm = signal('');

  protected readonly viewMode =
    signal<StaffOrderViewMode>('table');

  protected readonly createOrderMessage =
    signal<string | null>(null);

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

  // Add this method for the retry button.
  protected retryRestaurantLoad(): void {
    this.activeRestaurantState.refresh();
  }
}
