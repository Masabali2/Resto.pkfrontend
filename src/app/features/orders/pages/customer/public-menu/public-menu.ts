import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { environment } from '../../../../../../environments/environment';
import { OrderApiService } from '../../../services/order-api.service';
import { PublicOrderStateService } from '../../../services/public-order-state.service';
import type { PublicMenuDto } from '../../../models/order.models';
import { LoadingSpinner } from '../../../../../shared/components/loading-spinner/loading-spinner';

@Component({
  selector: 'app-public-menu',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './public-menu.html',
  imports: [LoadingSpinner],
  styleUrls: [
    // Reuse the exact Customer Preview stylesheet from Menu Management. No
    // duplicate CSS is introduced; the preview classes are shared by reference.
    '../../../../menu/pages/menu-management/menu-management.css'
  ],
  host: { class: 'public-menu' }
})
export class PublicMenu {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly orderApi = inject(OrderApiService);
  private readonly orderState = inject(PublicOrderStateService);

  readonly slug = this.route.snapshot.paramMap.get('slug') ?? '';
  readonly menus = signal<PublicMenuDto[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly previewSearch = signal('');
  readonly selectedPreviewCategory = signal<string>('all');

  readonly cart = this.orderState.cart;
  readonly cartLoading = this.orderState.cartLoading;
  readonly cartError = this.orderState.cartError;

  readonly menu = computed(() => this.menus()[0] ?? null);
  readonly categories = computed(() => this.menu()?.categories ?? []);
  readonly items = computed(() => this.categories().flatMap((c) =>
    c.items.map((i) => ({
      ...i,
      categoryId: c.id,
      categoryName: c.name,
      imageUrl: i.imageFileId
        ? `${environment.apiUrl}/v1/files/${i.imageFileId}`
        : null
    }))));
  readonly filteredItems = computed(() => {
    const search = this.previewSearch().toLowerCase();
    const category = this.selectedPreviewCategory();
    return this.items().filter((item) => {
      if (search) {
        const haystack = `${item.name} ${item.description ?? ''}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      if (category !== 'all' && item.categoryId !== category) return false;
      return true;
    });
  });

  readonly cartCount = computed(() => this.cart()?.items.length ?? 0);
  readonly cartSubtotal = computed(() => this.cart()?.totalAmount ?? 0);
  readonly cartCurrency = computed(() => this.cart()?.currency ?? 'PKR');

  constructor() {
    this.orderState.loadCart(this.slug);
    this.loadMenu();
  }

  loadMenu(): void {
    this.loading.set(true);
    this.error.set(null);

    this.orderApi.getPublicMenu(this.slug).subscribe({
      next: (response) => {
        this.loading.set(false);
        if (response.success && response.data?.length) {
          this.menus.set(response.data);
        } else {
          this.menus.set([]);
        }
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Menu could not be loaded. Please try again later.');
      }
    });
  }

  retry(): void {
    this.loadMenu();
  }

  formatMoney(amount: number, currency: string | null | undefined): string {
    try {
      return new Intl.NumberFormat('en-PK', {
        style: 'currency',
        currency: currency || 'PKR'
      }).format(amount);
    } catch {
      return `${currency || 'PKR'} ${amount}`;
    }
  }

  itemCurrency(item: { currency: string | null | undefined }): string {
    return item.currency || this.cartCurrency();
  }

  isInCart(itemId: string): boolean {
    const cartItem = this.cart()?.items.find((i) => i.menuItemId === itemId);
    return !!cartItem;
  }

  cartQuantity(itemId: string): number {
    return this.cart()?.items.find((i) => i.menuItemId === itemId)?.quantity ?? 0;
  }

  cartItemId(itemId: string): string | null {
    return this.cart()?.items.find((i) => i.menuItemId === itemId)?.id ?? null;
  }

  addToCart(item: { id: string; isAvailable: boolean }): void {
    if (!item.isAvailable) return;
    this.orderState.addCartItem(this.slug, item.id, 1);
  }

  increase(itemId: string): void {
    const cartItemId = this.cartItemId(itemId);
    const qty = this.cartQuantity(itemId);
    if (!cartItemId) return;
    this.orderState.updateCartItem(this.slug, cartItemId, qty + 1);
  }

  decrease(itemId: string): void {
    const cartItemId = this.cartItemId(itemId);
    const qty = this.cartQuantity(itemId);
    if (!cartItemId) return;
    if (qty <= 1) {
      this.orderState.removeCartItem(this.slug, cartItemId);
    } else {
      this.orderState.updateCartItem(this.slug, cartItemId, qty - 1);
    }
  }

  removeFromCart(itemId: string): void {
    const cartItemId = this.cartItemId(itemId);
    if (cartItemId) this.orderState.removeCartItem(this.slug, cartItemId);
  }

  goCheckout(): void {
    if (this.cartCount() === 0) return;
    this.router.navigateByUrl(`/r/${encodeURIComponent(this.slug)}/checkout`);
  }

  clearSearch(): void {
    this.previewSearch.set('');
    this.selectedPreviewCategory.set('all');
  }

  trackByItem(_: number, item: { id: string }): string {
    return item.id;
  }
}
