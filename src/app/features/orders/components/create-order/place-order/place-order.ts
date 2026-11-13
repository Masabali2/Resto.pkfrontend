import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { CustomerInformationData } from '../customer-information/customer-information';
import type { OrderType } from '../../../models/order.models';
import type { StaffOrderDetails } from '../../../models/order.models';

@Component({
  selector: 'app-place-order',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './place-order.html',
  styleUrl: './place-order.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlaceOrder {
  readonly customer = input.required<CustomerInformationData>();
  readonly orderType = input<OrderType | null>(null);
  readonly items = input.required<Array<{ menuItemId: string; itemName: string; unitPrice: number; quantity: number; currency: string; }>>();
  readonly subtotal = input<number>(0);
  readonly taxAmount = input<number>(0);
  readonly totalAmount = input<number>(0);
  readonly currency = input<string>('');
  readonly paymentMethod = input<string>('Cash');

  readonly submitting = input<boolean>(false);
  readonly error = input<string | null>(null);
  readonly placedOrder = input<StaffOrderDetails | null>(null);

  readonly placeOrder = output<void>();

  readonly isValid = computed(() => {
    if (this.items().length === 0) return false;
    if (!this.customer().customerName?.trim()) return false;
    if (!this.customer().phone?.trim()) return false;
    if (!this.orderType()) return false;
    return true;
  });

  readonly lineItemCount = computed(() =>
    this.items().reduce((sum, item) => sum + item.quantity, 0)
  );

  onPlaceOrder() {
    if (!this.isValid() || this.submitting()) {
      return;
    }
    this.placeOrder.emit();
  }
}

