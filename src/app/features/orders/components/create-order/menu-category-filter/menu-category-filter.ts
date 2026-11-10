import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output
} from '@angular/core';

import type { StaffCreateOrderCategory } from '../../../models/order.models';

export type MenuSortOption =
  | 'recommended'
  | 'name-asc'
  | 'name-desc'
  | 'price-asc'
  | 'price-desc';

export interface MenuFilterState {
  searchTerm: string;
  categoryId: string | null;
  dealsOnly: boolean;
  discountedOnly: boolean;
  availableOnly: boolean;
  vegetarianOnly: boolean;
  minPrice: number | null;
  maxPrice: number | null;
  sortBy: MenuSortOption;
}

export const DEFAULT_MENU_FILTERS: MenuFilterState = {
  searchTerm: '',
  categoryId: null,
  dealsOnly: false,
  discountedOnly: false,
  availableOnly: true,
  vegetarianOnly: false,
  minPrice: null,
  maxPrice: null,
  sortBy: 'recommended'
};

@Component({
  selector: 'app-menu-category-filter',
  standalone: true,
  templateUrl: './menu-category-filter.html',
  styleUrl: './menu-category-filter.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MenuCategoryFilter {
  // Create Order menu data
  readonly categories = input<StaffCreateOrderCategory[]>([]);
  readonly itemCounts = input<Record<string, number>>({});
  readonly totalItems = input(0);

  // Current filter state, owned by the parent
  readonly filters = input<MenuFilterState>(DEFAULT_MENU_FILTERS);
  readonly resultCount = input<number | null>(null);

  // Price boundaries supplied by the parent
  readonly minAvailablePrice = input(0);
  readonly maxAvailablePrice = input(10000);
  readonly currency = input('PKR');

  // Feature availability
  readonly dealsAvailable = input(false);
  readonly discountsAvailable = input(false);
  readonly dietaryFiltersAvailable = input(false);

  // Loading state
  readonly loading = input(false);

  // Events
  readonly filterChange = output<MenuFilterState>();
  readonly clearFilters = output<void>();

  protected readonly activeFilterCount = computed(() => {
    const filters = this.filters();

    let count = 0;

    if (filters.searchTerm.trim()) {
      count++;
    }

    if (filters.categoryId) {
      count++;
    }

    if (filters.dealsOnly) {
      count++;
    }

    if (filters.discountedOnly) {
      count++;
    }

    if (!filters.availableOnly) {
      count++;
    }

    if (filters.vegetarianOnly) {
      count++;
    }

    if (filters.minPrice !== null) {
      count++;
    }

    if (filters.maxPrice !== null) {
      count++;
    }

    if (filters.sortBy !== 'recommended') {
      count++;
    }

    return count;
  });

  protected readonly hasActiveFilters = computed(
    () => this.activeFilterCount() > 0
  );

  protected readonly displayedMinPrice = computed(
    () =>
      this.filters().minPrice ??
      this.minAvailablePrice()
  );

  protected readonly displayedMaxPrice = computed(
    () =>
      this.filters().maxPrice ??
      this.maxAvailablePrice()
  );

  protected onSearchChange(event: Event): void {
    const target = event.target as HTMLInputElement;

    this.updateFilter(
      'searchTerm',
      target.value
    );
  }

  protected onCategoryChange(
    categoryId: string | null
  ): void {
    this.updateFilter(
      'categoryId',
      categoryId
    );
  }

  protected onDealsChange(event: Event): void {
    const target = event.target as HTMLInputElement;

    this.updateFilter(
      'dealsOnly',
      target.checked
    );
  }

  protected onDiscountedChange(event: Event): void {
    const target = event.target as HTMLInputElement;

    this.updateFilter(
      'discountedOnly',
      target.checked
    );
  }

  protected onAvailabilityChange(event: Event): void {
    const target = event.target as HTMLInputElement;

    this.updateFilter(
      'availableOnly',
      target.checked
    );
  }

  protected onVegetarianChange(event: Event): void {
    const target = event.target as HTMLInputElement;

    this.updateFilter(
      'vegetarianOnly',
      target.checked
    );
  }

  protected onMinPriceChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const value = this.parsePrice(target.value);

    if (
      value !== null &&
      value > this.displayedMaxPrice()
    ) {
      this.updateFilters({
        minPrice: value,
        maxPrice: value
      });

      return;
    }

    this.updateFilter(
      'minPrice',
      value
    );
  }

  protected onMaxPriceChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const value = this.parsePrice(target.value);

    if (
      value !== null &&
      value < this.displayedMinPrice()
    ) {
      this.updateFilters({
        minPrice: value,
        maxPrice: value
      });

      return;
    }

    this.updateFilter(
      'maxPrice',
      value
    );
  }

  protected onSortChange(event: Event): void {
    const target = event.target as HTMLSelectElement;

    this.updateFilter(
      'sortBy',
      target.value as MenuSortOption
    );
  }

  protected resetFilters(): void {
    this.clearFilters.emit();
  }

  protected clearSearch(): void {
    this.updateFilter(
      'searchTerm',
      ''
    );
  }

  protected getCategoryCount(
    categoryId: string
  ): number {
    return this.itemCounts()[categoryId] ?? 0;
  }

  protected formatPrice(value: number): string {
    return new Intl.NumberFormat('en-PK', {
      maximumFractionDigits: 0
    }).format(value);
  }

  private parsePrice(
    value: string
  ): number | null {
    if (value.trim() === '') {
      return null;
    }

    const parsed = Number(value);

    if (!Number.isFinite(parsed)) {
      return null;
    }

    return Math.max(
      this.minAvailablePrice(),
      Math.min(
        this.maxAvailablePrice(),
        parsed
      )
    );
  }

  private updateFilter<K extends keyof MenuFilterState>(
    key: K,
    value: MenuFilterState[K]
  ): void {
    this.updateFilters({
      [key]: value
    });
  }

  private updateFilters(
    changes: Partial<MenuFilterState>
  ): void {
    this.filterChange.emit({
      ...this.filters(),
      ...changes
    });
  }
}