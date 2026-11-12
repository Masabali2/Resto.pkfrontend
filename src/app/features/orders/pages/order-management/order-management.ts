
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal
} from '@angular/core';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';

import { ActiveRestaurantStateService } from '../../../../core/services/active-restaurant-state.service';
import { OrderSummary } from '../../components/order-summary/order-summary';
import {
  StaffOrderHeader,
  type StaffOrderViewMode
} from '../../components/staff-order-header/staff-order-header';

import { OrderList } from '../staff/order-list/order-list';
import { OrderStateService } from '../../services/order-state.service';
import { OrderKanban } from '../../components/order-kanban/order-kanban';
@Component({
  selector: 'app-order-management',
  standalone: true,
  imports: [
    StaffOrderHeader,
    OrderKanban,
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

  private readonly router = inject(Router);

  private readonly searchSubject = new Subject<string>();

  protected readonly restaurant =
    this.activeRestaurantState.restaurant;

  protected readonly restaurantState =
    this.activeRestaurantState.state;

  protected readonly restaurantError =
    this.activeRestaurantState.errorMessage;

  protected readonly searchTerm = signal('');

  protected readonly viewMode =
    signal<StaffOrderViewMode>('table');

  // Automatically load the summary when the active restaurant changes.
  private readonly summaryEffect = effect(() => {
    const activeRestaurant = this.restaurant();

    if (!activeRestaurant) {
      return;
    }

    this.orderState.loadSummary(activeRestaurant.id);
  });

  // Debounce search input so API requests are not fired on every keystroke.
  private readonly searchEffect = effect(() => {
    const value = this.searchTerm();
    this.searchSubject.next(value);
  });

  constructor() {
    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe(value => {
        const restaurantId = this.restaurant()?.id;
        if (restaurantId) {
          this.orderState.setSearchTerm(restaurantId, value);
        }
      });
  }

  protected onSearchChange(value: string): void {
    this.searchTerm.set(value);
  }

  protected onViewModeChange(mode: StaffOrderViewMode): void {
    this.viewMode.set(mode);
  }

  protected onCreateOrder(): void {
    void this.router.navigate(['/orders/create']);
  }

  protected retryRestaurantLoad(): void {
    this.activeRestaurantState.refresh();
  }
}
