import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { StaffCartItem } from '../../../models/order.models';

@Component({
  selector: 'app-cart-item',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './cart-item.html',
  styleUrl: './cart-item.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartItem {
  readonly item = input.required<StaffCartItem>();

  readonly quantityChange = output<number>();
  readonly remove = output<string>();

  readonly lineTotal = computed(() => this.item().unitPrice * this.item().quantity);

  decrement() {
    const next = Math.max(1, this.item().quantity - 1);
    if (next !== this.item().quantity) {
      this.quantityChange.emit(next);
    }
  }

  increment() {
    this.quantityChange.emit(this.item().quantity + 1);
  }

  onRemove() {
    this.remove.emit(this.item().menuItemId);
  }
}

