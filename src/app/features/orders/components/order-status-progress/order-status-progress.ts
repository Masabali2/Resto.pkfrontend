import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { OrderStatus } from '../../models/order.models';
import { ORDER_STATUS_STEPS, getOrderStatusStep } from '../../utils/order-status.util';

@Component({
  selector: 'app-order-status-progress',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './order-status-progress.html',
  styleUrl: './order-status-progress.css'
})
export class OrderStatusProgress {
  readonly status = input.required<OrderStatus>();
  protected readonly steps = ORDER_STATUS_STEPS;
  protected readonly activeStep = computed(() => getOrderStatusStep(this.status()));
  protected readonly isCancelled = computed(() => this.status() === 'Cancelled');
}
