import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { StaffCartItem } from '../../../models/order.models';

@Component({
  selector: 'app-cart-summary',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './cart-summary.html',
  styleUrl: './cart-summary.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartSummary {
  readonly items = input.required<StaffCartItem[]>();
  readonly taxRate = input<number>(0);
  readonly currency = input<string>('');

  readonly subtotal = computed(
    () => this.items().reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  );

  readonly taxAmount = computed(() => {
    const rate = this.taxRate();
    if (rate <= 0 || this.subtotal() <= 0) {
      return 0;
    }
    return Math.round((this.subtotal() * rate) / 100 * 10000) / 10000;
  });

  readonly total = computed(() => this.subtotal() + this.taxAmount());
}

