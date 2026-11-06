import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { OrderType } from '../../models/order.models';

@Component({
  selector: 'app-order-type-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="type-badge">
      @switch (type()) {
        @case ('Pickup') { <i class="bi bi-bag" aria-hidden="true"></i> }
        @case ('DineIn') { <i class="bi bi-cup-hot" aria-hidden="true"></i> }
        @case ('Delivery') { <i class="bi bi-bicycle" aria-hidden="true"></i> }
      }
      {{ label() }}
    </span>
  `,
  styles: [`
    :host { display: inline-flex; }
    .type-badge {
      display: inline-flex; align-items: center; gap: 7px; min-height: 27px;
      padding: 4px 10px; border: 1px solid var(--color-border);
      border-radius: var(--radius-full); background: var(--color-surface-secondary);
      color: var(--color-text-secondary); font-size: 11px; font-weight: 700; white-space: nowrap;
    }
  `]
})
export class OrderTypeBadge {
  readonly type = input.required<OrderType>();

  protected label(): string {
    return this.type() === 'DineIn' ? 'Dine-in' : this.type();
  }
}
