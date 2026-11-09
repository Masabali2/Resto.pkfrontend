import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { OrderStatus } from '../../models/order.models';

@Component({
  selector: 'app-order-status-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="status-badge" [class]="'status-badge status-' + status().toLowerCase()">
      <span class="status-dot" aria-hidden="true"></span>
      {{ status() }}
    </span>
  `,
  styleUrl: './order-status-badge.css'
})
export class OrderStatusBadge {
  readonly status = input.required<OrderStatus>();
}
