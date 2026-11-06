import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PublicOrderFrame } from '../../../components/public-order-frame/public-order-frame';
import { OrderApiService } from '../../../services/order-api.service';
import { HttpErrorHandlerService } from '../../../../core/services/http-error-handler.service';

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
  private readonly orderApi = inject(OrderApiService);
  private readonly errors = inject(HttpErrorHandlerService);

  protected readonly slug = signal(this.route.snapshot.paramMap.get('slug') ?? '');
  protected readonly cart = signal<import('../../../models/order.models').PublicCart | null>(null);
  protected readonly loading = signal(true);
  protected readonly busyItem = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);

  constructor() {
    this.loadCart();
  }

  protected changeQuantity(itemId: string, quantity: number): void {
    if (quantity < 1 || quantity > 99 || this.busyItem()) return;
    this.busyItem.set(itemId);
    this.error.set(null);
    this.orderApi.updateCartItem(this.slug(), itemId, quantity).subscribe({
      next: response => {
        this.busyItem.set(null);
        if (!response.success) {
          this.error.set(response.message ?? 'Cart item could not be updated.');
          return;
        }
        this.loadCart(false);
      },
      error: error => {
        this.busyItem.set(null);
        this.error.set(this.errors.handle(error, { fallbackMessage: 'Cart item could not be updated.' }).message);
      }
    });
  }

  protected removeItem(itemId: string): void {
    if (this.busyItem()) return;
    this.busyItem.set(itemId);
    this.error.set(null);
    this.orderApi.removeCartItem(this.slug(), itemId).subscribe({
      next: response => {
        this.busyItem.set(null);
        if (!response.success) {
          this.error.set(response.message ?? 'Cart item could not be removed.');
          return;
        }
        this.loadCart(false);
      },
      error: error => {
        this.busyItem.set(null);
        this.error.set(this.errors.handle(error, { fallbackMessage: 'Cart item could not be removed.' }).message);
      }
    });
  }

  protected clearCart(): void {
    if (!this.cart()?.items.length || this.busyItem()) return;
    this.busyItem.set('cart');
    this.error.set(null);
    this.orderApi.clearCart(this.slug()).subscribe({
      next: response => {
        this.busyItem.set(null);
        if (!response.success) {
          this.error.set(response.message ?? 'Cart could not be cleared.');
          return;
        }
        this.loadCart(false);
      },
      error: error => {
        this.busyItem.set(null);
        this.error.set(this.errors.handle(error, { fallbackMessage: 'Cart could not be cleared.' }).message);
      }
    });
  }

  protected retry(): void { this.loadCart(); }

  private loadCart(showLoading = true): void {
    if (showLoading) this.loading.set(true);
    this.error.set(null);
    this.orderApi.getCart(this.slug()).subscribe({
      next: response => {
        this.loading.set(false);
        if (!response.success || !response.data) {
          this.error.set(response.message ?? 'Cart could not be loaded.');
          this.cart.set(null);
          return;
        }
        this.cart.set(response.data);
      },
      error: error => {
        this.loading.set(false);
        this.error.set(this.errors.handle(error, { fallbackMessage: 'Cart could not be loaded.' }).message);
      }
    });
  }
}