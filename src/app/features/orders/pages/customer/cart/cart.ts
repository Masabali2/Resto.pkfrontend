import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { PublicOrderFrame } from '../../../components/public-order-frame/public-order-frame';
import { PublicOrderStateService } from '../../../services/public-order-state.service';

@Component({
  selector: 'app-public-cart',
  standalone: true,
  imports: [DecimalPipe, PublicOrderFrame],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cart.html',
  styleUrl: './cart.css'
})
export class PublicCart {
  private readonly route = inject(ActivatedRoute);
  private readonly publicOrderState = inject(PublicOrderStateService);
  private readonly routeParams = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap
  });

  protected readonly slug = computed(() => this.routeParams().get('slug') ?? '');
  protected readonly cart = this.publicOrderState.cart;
  protected readonly loading = this.publicOrderState.cartLoading;
  protected readonly busy = this.publicOrderState.cartMutating;
  protected readonly error = this.publicOrderState.cartError;

  constructor() {
    effect(() => {
      const slug = this.slug();
      if (slug) untracked(() => this.publicOrderState.loadCart(slug));
    });
  }

  protected changeQuantity(itemId: string, quantity: number): void {
    const slug = this.slug();
    if (quantity < 1 || quantity > 99 || this.busy() || !slug) return;
    this.publicOrderState.updateCartItem(slug, itemId, quantity);
  }

  protected removeItem(itemId: string): void {
    const slug = this.slug();
    if (this.busy() || !slug) return;
    this.publicOrderState.removeCartItem(slug, itemId);
  }

  protected clearCart(): void {
    const slug = this.slug();
    if (!this.cart()?.items.length || this.busy() || !slug) return;
    this.publicOrderState.clearCart(slug);
  }

  protected retry(): void {
    const slug = this.slug();
    if (slug) this.publicOrderState.refreshCart(slug);
  }
}