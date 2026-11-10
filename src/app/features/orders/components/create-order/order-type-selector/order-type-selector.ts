import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import type { OrderType } from '../../../models/order.models';

const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  Pickup: 'Pickup',
  DineIn: 'Dine In',
  Delivery: 'Delivery',
};

@Component({
  selector: 'app-order-type-selector',
  standalone: true,
  imports: [],
  templateUrl: './order-type-selector.html',
  styleUrl: './order-type-selector.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderTypeSelector {
  readonly orderTypes = input<string[]>([]);
  readonly selected = input<OrderType | null>(null);

  readonly orderTypeChange = output<OrderType>();

  private readonly touched = signal(false);

  readonly options = computed(() =>
    this.orderTypes().filter((type): type is OrderType =>
      type === 'Pickup' || type === 'DineIn' || type === 'Delivery'
    )
  );

  readonly isValid = computed(() => this.options().includes(this.selected() ?? '' as OrderType));

  readonly labelFor = (type: OrderType) => ORDER_TYPE_LABELS[type];

  select(type: OrderType) {
    this.touched.set(true);
    this.orderTypeChange.emit(type);
  }

  readonly isSelected = (type: OrderType) => this.selected() === type;
}

