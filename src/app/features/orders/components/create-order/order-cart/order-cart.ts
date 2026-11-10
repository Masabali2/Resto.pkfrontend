import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { StaffCartItem } from '../../../models/order.models';
import { CartItem } from '../cart-item/cart-item';
import { CartSummary } from '../cart-summary/cart-summary';

@Component({
  selector: 'app-order-cart',
  standalone: true,
  imports: [CartItem, CartSummary],
  templateUrl: './order-cart.html',
  styleUrl: './order-cart.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderCart {
  readonly items = input.required<StaffCartItem[]>();
  readonly taxRate = input<number>(0);
  readonly currency = input<string>('');

  readonly quantityChange = output<{ menuItemId: string; quantity: number }>();
  readonly remove = output<string>();

  readonly itemCount = computed(() =>
    this.items().reduce((sum, item) => sum + item.quantity, 0)
  );

  readonly isEmpty = computed(() => this.items().length === 0);

  onQuantityChange(menuItemId: string, quantity: number) {
    this.quantityChange.emit({ menuItemId, quantity });
  }

  onRemove(menuItemId: string) {
    this.remove.emit(menuItemId);
  }
}

