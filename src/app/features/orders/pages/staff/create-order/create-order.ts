
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

import {
  OrderCart
} from '../../../components/create-order/order-cart/order-cart';

import {
  OrderTypeSelector
} from '../../../components/create-order/order-type-selector/order-type-selector';

import {
  PlaceOrder
} from '../../../components/create-order/place-order/place-order';

import type {
  CreateStaffOrderRequest,
  OrderType,
  StaffCartItem,
  StaffCreateOrderCategory,
  StaffCreateOrderContext,
  StaffCreateOrderItem,
  StaffOrderDetails
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
    CustomerInformation,
    OrderCart,
    OrderTypeSelector,
    PlaceOrder
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

  // ---------------------------------------------------------------------------
  // Cart state (single source of truth for the Create Order workflow)
  // ---------------------------------------------------------------------------

  protected readonly cartItems = signal<StaffCartItem[]>([]);

  protected readonly selectedOrderType = signal<OrderType | null>(null);

  protected readonly placingOrder = signal<boolean>(false);

  protected readonly placeError = signal<string | null>(null);

  protected readonly placedOrder = signal<StaffOrderDetails | null>(null);

  protected readonly cartSubtotal = computed(() =>
    this.cartItems().reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  );

  protected readonly cartTax = computed(() => {
    const rate = this.taxRate();
    if (rate <= 0 || this.cartSubtotal() <= 0) {
      return 0;
    }
    return Math.round((this.cartSubtotal() * rate) / 100 * 10000) / 10000;
  });

  protected readonly cartTotal = computed(() =>
    this.cartSubtotal() + this.cartTax()
  );

  protected readonly cartItemCount = computed(() =>
    this.cartItems().reduce((sum, item) => sum + item.quantity, 0)
  );

  protected readonly cartHasItems = computed(() => this.cartItems().length > 0);

  protected readonly canPlaceOrder = computed(() =>
    this.cartHasItems() &&
    !!this.customerInformation().customerName?.trim() &&
    !!this.customerInformation().phone?.trim() &&
    !!this.selectedOrderType()
  );

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
    if (!item.isActive || !item.isAvailable) {
      return;
    }

    const existing = this.cartItems().find(cartItem => cartItem.menuItemId === item.id);

    if (existing) {
      this.cartItems.update(items =>
        items.map(cartItem =>
          cartItem.menuItemId === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        )
      );
      return;
    }

    this.cartItems.update(items => [
      ...items,
      {
        menuItemId: item.id,
        itemName: item.name,
        unitPrice: item.price,
        quantity: 1,
        currency: item.currency
      }
    ]);
  }

  protected onCartQuantityChange(
    menuItemId: string,
    quantity: number
  ): void {
    this.cartItems.update(items =>
      items.map(cartItem =>
        cartItem.menuItemId === menuItemId ? { ...cartItem, quantity } : cartItem
      )
    );
  }

  protected onCartRemove(menuItemId: string): void {
    this.cartItems.update(items =>
      items.filter(cartItem => cartItem.menuItemId !== menuItemId)
    );
  }

  protected clearCart(): void {
    this.cartItems.set([]);
    this.placedOrder.set(null);
    this.placeError.set(null);
  }

  protected onOrderTypeChange(orderType: OrderType): void {
    this.selectedOrderType.set(orderType);
  }

  protected placeOrder(): void {
    if (!this.canPlaceOrder() || this.placingOrder()) {
      return;
    }

    const customer = this.customerInformation();
    const restaurant = this.restaurant();

    if (!restaurant) {
      return;
    }

    const request: CreateStaffOrderRequest = {
      orderType: this.selectedOrderType()!,
      customerName: customer.customerName.trim(),
      customerPhone: customer.phone?.trim() || null,
      customerEmail: customer.email?.trim() || null,
      specialInstructions: customer.specialInstructions?.trim() || null,
      items: this.cartItems().map(cartItem => ({
        menuItemId: cartItem.menuItemId,
        quantity: cartItem.quantity
      }))
    };

    this.placingOrder.set(true);
    this.placeError.set(null);
    this.placedOrder.set(null);

    this.orderApiService
      .createStaffOrder(restaurant.id, request)
      .subscribe({
        next: response => {
          this.placingOrder.set(false);

          if (!response.success || !response.data) {
            this.placeError.set(
              response.message ?? 'Unable to create the order.'
            );
            return;
          }

          this.placedOrder.set(response.data);
        },

        error: error => {
          this.placingOrder.set(false);
          this.placeError.set(this.extractPlaceOrderError(error));
        }
      });
  }

  private extractPlaceOrderError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 403) {
        return 'You are not allowed to create orders for this restaurant.';
      }

      if (error.status === 404) {
        return 'The restaurant or one of the menu items is no longer available.';
      }

      if (error.status === 400) {
        return error.error?.message ?? 'Invalid order. Please check your cart and customer details.';
      }

      if (error.status === 409) {
        return 'This order could not be created. Please try again.';
      }

      return (
        this.httpErrorHandler.extractBackendMessage(error) ??
        'Unable to create the order. Please try again.'
      );
    }

    return 'Unable to create the order. Please try again.';
  }

  // ---------------------------------------------------------------------------
  // Customer information
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
