import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { OrderStatus } from '../../models/order.models';
import { getNextOrderStatuses } from '../../utils/order-status.util';

@Component({
  selector: 'app-order-workflow-actions',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './order-workflow-actions.html',
  styleUrl: './order-workflow-actions.css'
})
export class OrderWorkflowActions {
  readonly status = input.required<OrderStatus>();
  protected readonly availableTransitions = computed(() => getNextOrderStatuses(this.status()));
}
