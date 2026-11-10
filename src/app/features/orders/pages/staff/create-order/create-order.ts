
import { HttpErrorResponse } from '@angular/common/http';

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked
} from '@angular/core';

import { ActiveRestaurantStateService } from '../../../../../core/services/active-restaurant-state.service';
import { HttpErrorHandlerService } from '../../../../../core/services/http-error-handler.service';

import { OrderApiService } from '../../../services/order-api.service';

import {
  CreateOrderHeader
} from '../../../components/create-order/create-order-header/create-order-header';

import {
  MenuCategoryFilter,
  DEFAULT_MENU_FILTERS,
  type MenuFilterState
} from '../../../components/create-order/menu-category-filter/menu-category-filter';

import {
  MenuCatalog
} from '../../../components/create-order/menu-catalog/menu-catalog';

import {
  CustomerInformation,
  type CustomerInformationData
} from '../../../components/create-order/customer-information/customer-information';

import type {
  StaffCreateOrderCategory,
  StaffCreateOrderContext,
  StaffCreateOrderItem
} from '../../../models/order.models';

type CreateOrderPageState =
  | 'loading'
  | 'ready'
  | 'no-menu'
  | 'empty'
  | 'error'
  | 'forbidden';

const DEFAULT_CUSTOMER_INFORMATION: CustomerInformationData = {
  customerName: '',
  phone: '',
  email: '',
  specialInstructions: ''
};

@Component({
  selector: 'app-create-order',
  standalone: true,
  imports: [
    CreateOrderHeader,
    MenuCategoryFilter,
    MenuCatalog,
    CustomerInformation
  ],
  templateUrl: './create-order.html',
  styleUrl: './create-order.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CreateOrder {
  private readonly activeRestaurantState =
    inject(ActiveRestaurantStateService);

  private readonly orderApiService =
    inject(OrderApiService);

  private readonly httpErrorHandler =
    inject(HttpErrorHandlerService);

  protected readonly restaurant =
    this.activeRestaurantState.restaurant;

  // ---------------------------------------------------------------------------
  // Page state
  // ---------------------------------------------------------------------------

  protected readonly pageState =
    signal<CreateOrderPageState>('loading');

  protected readonly errorMessage =
    signal<string | null>(null);

  // ---------------------------------------------------------------------------
  // Create Order context
  // ---------------------------------------------------------------------------

  protected readonly createOrderContext =
    signal<StaffCreateOrderContext | null>(null);

  protected readonly categories =
    signal<StaffCreateOrderCategory[]>([]);

  protected readonly menuItems =
    signal<StaffCreateOrderItem[]>([]);

  protected readonly menuId =
    computed(() =>
      this.createOrderContext()?.menuId ?? null
    );

  protected readonly menuName =
    computed(() =>
      this.createOrderContext()?.menuName ?? ''
    );

  protected readonly orderTypes =
    computed(() =>
      this.createOrderContext()?.orderTypes ?? []
    );

  protected readonly paymentMethod =
    computed(() =>
      this.createOrderContext()?.paymentMethod ?? 'Cash'
    );

  protected readonly taxRate =
    computed(() =>
      this.createOrderContext()?.taxRate ?? 0
    );

  protected readonly currency =
    computed(() =>
      this.createOrderContext()?.currency ?? 'PKR'
    );

  // ---------------------------------------------------------------------------
  // Filter state
  // ---------------------------------------------------------------------------

  protected readonly menuFilters =
    signal<MenuFilterState>({
      ...DEFAULT_MENU_FILTERS
    });

  // ---------------------------------------------------------------------------
  // Customer information
  // ---------------------------------------------------------------------------

  protected readonly customerInformation =
    signal<CustomerInformationData>({
      ...DEFAULT_CUSTOMER_INFORMATION
    });

  private requestSequence = 0;

  // ---------------------------------------------------------------------------
  // Menu computed state
  // ---------------------------------------------------------------------------

  protected readonly activeMenuItems =
    computed(() =>
      this.menuItems().filter(item => item.isActive)
    );

  protected readonly availableMenuItems =
    computed(() =>
      this.activeMenuItems().filter(item => item.isAvailable)
    );

  protected readonly minMenuPrice =
    computed(() => {
      const prices = this.availableMenuItems()
        .map(item => Number(item.price))
        .filter(price =>
          Number.isFinite(price) && price >= 0
        );

      return prices.length > 0
        ? Math.min(...prices)
        : 0;
    });

  protected readonly maxMenuPrice =
    computed(() => {
      const prices = this.availableMenuItems()
        .map(item => Number(item.price))
        .filter(price =>
          Number.isFinite(price) && price >= 0
        );

      return prices.length > 0
        ? Math.max(...prices)
        : 10000;
    });

  protected readonly menuCurrency =
    computed(() => this.currency());

  protected readonly categoryItemCounts =
    computed<Record<string, number>>(() => {
      const counts: Record<string, number> = {};

      for (const item of this.availableMenuItems()) {
        const categoryId = item.menuCategoryId;

        counts[categoryId] =
          (counts[categoryId] ?? 0) + 1;
      }

      return counts;
    });

  protected readonly filteredMenuItems =
    computed(() => {
      const filters = this.menuFilters();

      let items = [...this.activeMenuItems()];

      // Category
      if (filters.categoryId) {
        items = items.filter(
          item =>
            item.menuCategoryId === filters.categoryId
        );
      }

      // Availability
      if (filters.availableOnly) {
        items = items.filter(
          item => item.isAvailable
        );
      }

      // Search
      const search =
        filters.searchTerm.trim().toLowerCase();

      if (search) {
        items = items.filter(item => {
          const categoryName =
            item.categoryName ??
            this.categories().find(
              category =>
                category.id === item.menuCategoryId
            )?.name ??
            '';

          return (
            item.name.toLowerCase().includes(search) ||
            (item.description ?? '').toLowerCase().includes(search) ||
            categoryName.toLowerCase().includes(search)
          );
        });
      }

      // Minimum price
      if (filters.minPrice !== null) {
        items = items.filter(
          item =>
            Number(item.price) >= filters.minPrice!
        );
      }

      // Maximum price
      if (filters.maxPrice !== null) {
        items = items.filter(
          item =>
            Number(item.price) <= filters.maxPrice!
        );
      }

      // Sorting
      switch (filters.sortBy) {
        case 'name-asc':
          items.sort((a, b) =>
            a.name.localeCompare(b.name)
          );
          break;

        case 'name-desc':
          items.sort((a, b) =>
            b.name.localeCompare(a.name)
          );
          break;

        case 'price-asc':
          items.sort(
            (a, b) =>
              Number(a.price) - Number(b.price)
          );
          break;

        case 'price-desc':
          items.sort(
            (a, b) =>
              Number(b.price) - Number(a.price)
          );
          break;

        case 'recommended':
        default:
          items.sort(
            (a, b) =>
              a.displayOrder - b.displayOrder
          );
          break;
      }

      return items;
    });

  // ---------------------------------------------------------------------------
  // Initialization
  // ---------------------------------------------------------------------------

  constructor() {
    effect(() => {
      const restaurantId = this.restaurant()?.id;

      untracked(() => {
        if (!restaurantId) {
          this.requestSequence++;

          this.resetPage();
          this.pageState.set('loading');

          return;
        }

        this.loadCreateOrderContext(restaurantId);
      });
    });
  }

  // ---------------------------------------------------------------------------
  // API
  // ---------------------------------------------------------------------------

  private loadCreateOrderContext(
    restaurantId: string
  ): void {
    const requestId = ++this.requestSequence;

    this.resetPage();
    this.pageState.set('loading');

    this.orderApiService
      .getCreateOrderContext(restaurantId)
      .subscribe({
        next: response => {
          if (!this.isCurrentRequest(requestId)) {
            return;
          }

          if (!response.success || !response.data) {
            this.setError(
              response.message ??
              'Unable to load the Create Order context.'
            );

            return;
          }

          this.applyCreateOrderContext(response.data);
        },

        error: error => {
          if (this.isCurrentRequest(requestId)) {
            this.handleLoadError(error);
          }
        }
      });
  }

  private applyCreateOrderContext(
    context: StaffCreateOrderContext
  ): void {
    this.createOrderContext.set(context);

    const activeCategories = context.categories
      .filter(category => category.isActive)
      .sort(
        (a, b) =>
          a.displayOrder - b.displayOrder
      );

    const activeCategoryIds = new Set(
      activeCategories.map(category => category.id)
    );

    const activeItems = context.items
      .filter(item =>
        item.isActive &&
        activeCategoryIds.has(item.menuCategoryId)
      )
      .sort(
        (a, b) =>
          a.displayOrder - b.displayOrder
      );

    this.categories.set(activeCategories);
    this.menuItems.set(activeItems);

    if (activeItems.length === 0) {
      this.pageState.set('empty');
      return;
    }

    this.pageState.set('ready');
  }

  // ---------------------------------------------------------------------------
  // Menu item selection
  // ---------------------------------------------------------------------------

  protected onMenuItemSelected(
    item: StaffCreateOrderItem
  ): void {
    // Cart state and quantity management will be implemented
    // in the next order-building step.
    if (!item.isActive || !item.isAvailable) {
      return;
    }

    // The selected item is now received by the parent.
    // Do not submit an order or modify the backend here.
  }

  // ---------------------------------------------------------------------------
  // Filters
  // ---------------------------------------------------------------------------

  protected onMenuFilterChange(
    filters: MenuFilterState
  ): void {
    this.menuFilters.set(filters);
  }

  protected clearMenuFilters(): void {
    this.menuFilters.set({
      ...DEFAULT_MENU_FILTERS
    });
  }

  // ---------------------------------------------------------------------------
  // Customer information
  // ---------------------------------------------------------------------------

  protected onCustomerInformationChange(
    customer: CustomerInformationData
  ): void {
    this.customerInformation.set(customer);
  }

  // ---------------------------------------------------------------------------
  // Retry
  // ---------------------------------------------------------------------------

  protected retry(): void {
    const restaurantId = this.restaurant()?.id;

    if (!restaurantId) {
      return;
    }

    this.loadCreateOrderContext(restaurantId);
  }

  // ---------------------------------------------------------------------------
  // Reset
  // ---------------------------------------------------------------------------

  private resetPage(): void {
    this.errorMessage.set(null);

    this.createOrderContext.set(null);

    this.categories.set([]);
    this.menuItems.set([]);

    this.menuFilters.set({
      ...DEFAULT_MENU_FILTERS
    });

    this.customerInformation.set({
      ...DEFAULT_CUSTOMER_INFORMATION
    });
  }

  // ---------------------------------------------------------------------------
  // Errors
  // ---------------------------------------------------------------------------

  private setError(message: string): void {
    this.errorMessage.set(message);
    this.pageState.set('error');
  }

  private handleLoadError(error: unknown): void {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 403) {
        this.pageState.set('forbidden');
        return;
      }

      if (error.status === 404) {
        this.pageState.set('no-menu');
        return;
      }
    }

    this.setError(
      this.httpErrorHandler.extractBackendMessage(error) ??
      'Something went wrong while loading the menu. Please try again.'
    );
  }

  private isCurrentRequest(requestId: number): boolean {
    return requestId === this.requestSequence;
  }
}
