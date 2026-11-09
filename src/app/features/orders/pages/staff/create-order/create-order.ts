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
import { finalize } from 'rxjs';

import { ActiveRestaurantStateService } from '../../../../../core/services/active-restaurant-state.service';
import { HttpErrorHandlerService } from '../../../../../core/services/http-error-handler.service';

import { MenuService } from '../../../../menu/services/menu.service';

import type { MenuDto, MenuDetailsDto } from '../../../../menu/models/menu.model';
import type { MenuCategoryDto } from '../../../../menu/models/menu-category.model';
import type {
  MenuItemDto,
  MenuItemListQuery
} from '../../../../menu/models/menu-item.model';

import { CreateOrderHeader } from '../../../components/create-order/create-order-header/create-order-header';

import {
  MenuCategoryFilter,
  DEFAULT_MENU_FILTERS,
  type MenuFilterState
} from '../../../components/create-order/menu-category-filter/menu-category-filter';

type CreateOrderPageState =
  | 'loading'
  | 'ready'
  | 'no-menu'
  | 'empty'
  | 'error'
  | 'forbidden';

@Component({
  selector: 'app-create-order',
  standalone: true,
  imports: [
    CreateOrderHeader,
    MenuCategoryFilter
  ],
  templateUrl: './create-order.html',
  styleUrl: './create-order.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CreateOrder {
  private readonly activeRestaurantState =
    inject(ActiveRestaurantStateService);

  private readonly menuService = inject(MenuService);
  private readonly httpErrorHandler = inject(HttpErrorHandlerService);

  protected readonly restaurant = this.activeRestaurantState.restaurant;

  // Page state
  protected readonly pageState = signal<CreateOrderPageState>('loading');
  protected readonly errorMessage = signal<string | null>(null);

  // Menu data
  protected readonly menus = signal<MenuDto[]>([]);
  protected readonly selectedMenu = signal<MenuDetailsDto | null>(null);
  protected readonly categories = signal<MenuCategoryDto[]>([]);
  protected readonly menuItems = signal<MenuItemDto[]>([]);

  // Loading state
  protected readonly categoriesLoading = signal(false);
  protected readonly itemsLoading = signal(false);

  // Filter state
  protected readonly menuFilters = signal<MenuFilterState>({
    ...DEFAULT_MENU_FILTERS
  });

  private requestSequence = 0;

  // Only active menu items
  protected readonly activeMenuItems = computed(() =>
    this.menuItems().filter(item => item.isActive)
  );

  // Available menu items
  protected readonly availableMenuItems = computed(() =>
    this.activeMenuItems().filter(item => item.isAvailable)
  );

  // Price boundaries for the current menu
  protected readonly minMenuPrice = computed(() => {
    const prices = this.availableMenuItems()
      .map(item => Number(item.price))
      .filter(price => Number.isFinite(price));

    return prices.length > 0 ? Math.min(...prices) : 0;
  });

  protected readonly maxMenuPrice = computed(() => {
    const prices = this.availableMenuItems()
      .map(item => Number(item.price))
      .filter(price => Number.isFinite(price));

    return prices.length > 0 ? Math.max(...prices) : 10000;
  });

  // Currency from the loaded menu items
  protected readonly menuCurrency = computed(() =>
    this.availableMenuItems()[0]?.currency ?? 'PKR'
  );

  // Category counts
  protected readonly categoryItemCounts = computed<
    Record<string, number>
  >(() => {
    const counts: Record<string, number> = {};

    for (const item of this.availableMenuItems()) {
      const categoryId = item.menuCategoryId;

      if (!categoryId) {
        continue;
      }

      counts[categoryId] = (counts[categoryId] ?? 0) + 1;
    }

    return counts;
  });

  // Apply all supported filters and sorting
  protected readonly filteredMenuItems = computed(() => {
    const filters = this.menuFilters();

    let items = [...this.activeMenuItems()];

    if (filters.categoryId) {
      items = items.filter(
        item => item.menuCategoryId === filters.categoryId
      );
    }

    if (filters.availableOnly) {
      items = items.filter(item => item.isAvailable);
    }

    const search = filters.searchTerm.trim().toLowerCase();

    if (search) {
      items = items.filter(item => {
        const categoryName =
          item.categoryName ??
          this.categories().find(
            category => category.id === item.menuCategoryId
          )?.name ??
          '';

        return (
          item.name.toLowerCase().includes(search) ||
          (item.description ?? '').toLowerCase().includes(search) ||
          categoryName.toLowerCase().includes(search)
        );
      });
    }

    if (filters.minPrice !== null) {
      items = items.filter(
        item => Number(item.price) >= filters.minPrice!
      );
    }

    if (filters.maxPrice !== null) {
      items = items.filter(
        item => Number(item.price) <= filters.maxPrice!
      );
    }

    switch (filters.sortBy) {
      case 'name-asc':
        items.sort((a, b) => a.name.localeCompare(b.name));
        break;

      case 'name-desc':
        items.sort((a, b) => b.name.localeCompare(a.name));
        break;

      case 'price-asc':
        items.sort((a, b) => Number(a.price) - Number(b.price));
        break;

      case 'price-desc':
        items.sort((a, b) => Number(b.price) - Number(a.price));
        break;

      case 'recommended':
      default:
        break;
    }

    return items;
  });

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

        this.loadRestaurantMenu(restaurantId);
      });
    });
  }

  private loadRestaurantMenu(restaurantId: string): void {
    const requestId = ++this.requestSequence;

    this.resetPage();
    this.pageState.set('loading');

    this.menuService.getMenus(restaurantId, 1, 100).subscribe({
      next: response => {
        if (!this.isCurrentRequest(requestId)) {
          return;
        }

        if (!response.success || !response.data) {
          this.setError(
            response.message ?? 'Unable to load restaurant menus.'
          );
          return;
        }

        const restaurantMenus = response.data.items ?? [];

        this.menus.set(restaurantMenus);

        const orderableMenu = this.findOrderableMenu(restaurantMenus);

        if (!orderableMenu) {
          this.pageState.set('no-menu');
          return;
        }

        this.loadMenuDetails(orderableMenu.id, requestId);
      },

      error: error => {
        if (this.isCurrentRequest(requestId)) {
          this.handleLoadError(error);
        }
      }
    });
  }

  private findOrderableMenu(menus: MenuDto[]): MenuDto | null {
    return menus.find(menu =>
      menu.isActive && menu.status === 'Published'
    ) ?? null;
  }

  private loadMenuDetails(menuId: string, requestId: number): void {
    this.categoriesLoading.set(true);

    this.menuService.getMenu(menuId).subscribe({
      next: response => {
        if (!this.isCurrentRequest(requestId)) {
          return;
        }

        this.categoriesLoading.set(false);

        if (!response.success || !response.data) {
          this.setError(
            response.message ?? 'Unable to load menu details.'
          );
          return;
        }

        const menu = response.data;

        this.selectedMenu.set(menu);

        const activeCategories = [...(menu.categories ?? [])]
          .filter(category => category.isActive)
          .sort((a, b) => a.displayOrder - b.displayOrder);

        this.categories.set(activeCategories);

        this.loadMenuItems(menu.id, requestId);
      },

      error: error => {
        if (!this.isCurrentRequest(requestId)) {
          return;
        }

        this.categoriesLoading.set(false);
        this.handleLoadError(error);
      }
    });
  }

  private loadMenuItems(menuId: string, requestId: number): void {
    this.itemsLoading.set(true);

    const query: MenuItemListQuery = {
      page: 1,
      pageSize: 100
    };

    this.menuService
      .getMenuItemsQuery(menuId, query)
      .pipe(
        finalize(() => {
          if (this.isCurrentRequest(requestId)) {
            this.itemsLoading.set(false);
          }
        })
      )
      .subscribe({
        next: response => {
          if (!this.isCurrentRequest(requestId)) {
            return;
          }

          if (!response.success || !response.data) {
            this.setError(
              response.message ?? 'Unable to load menu items.'
            );
            return;
          }

          const items = response.data.items ?? [];

          // Keep unavailable items so the staff availability filter works.
          this.menuItems.set(
            items.filter(item => item.isActive)
          );

          this.pageState.set(
            this.menuItems().length > 0 ? 'ready' : 'empty'
          );
        },

        error: error => {
          if (this.isCurrentRequest(requestId)) {
            this.handleLoadError(error);
          }
        }
      });
  }

  // Filter events
  protected onMenuFilterChange(filters: MenuFilterState): void {
    this.menuFilters.set(filters);
  }

  protected clearMenuFilters(): void {
    this.menuFilters.set({
      ...DEFAULT_MENU_FILTERS
    });
  }

  // Retry
  protected retry(): void {
    const restaurantId = this.restaurant()?.id;

    if (restaurantId) {
      this.loadRestaurantMenu(restaurantId);
    }
  }

  // Reset
  private resetPage(): void {
    this.errorMessage.set(null);

    this.menus.set([]);
    this.selectedMenu.set(null);
    this.categories.set([]);
    this.menuItems.set([]);

    this.categoriesLoading.set(false);
    this.itemsLoading.set(false);

    this.menuFilters.set({
      ...DEFAULT_MENU_FILTERS
    });
  }

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