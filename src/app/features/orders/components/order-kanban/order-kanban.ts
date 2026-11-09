import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  signal,
  untracked
} from '@angular/core';

import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import type {
  OrderStatus,
  StaffOrderDetails
} from '../../models/order.models';

import { OrderStateService } from '../../services/order-state.service';
import { OrderStatusBadge } from '../order-status-badge/order-status-badge';
import { LoadingSpinner } from '../../../../shared/components/loading-spinner/loading-spinner';

interface KanbanColumn {
  status: OrderStatus;
  label: string;
  description: string;
  accent: string;
}

@Component({
  selector: 'app-order-kanban',
  standalone: true,
  imports: [
    DatePipe,
    DecimalPipe,
    RouterLink,
    OrderStatusBadge,
    LoadingSpinner
  ],
  templateUrl: './order-kanban.html',
  styleUrl: './order-kanban.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrderKanban {
  private readonly orderState = inject(OrderStateService);

  readonly restaurantId = input.required<string>();

  protected readonly columns: readonly KanbanColumn[] = [
    {
      status: 'New',
      label: 'New Orders',
      description: 'Awaiting confirmation',
      accent: '#F59E0B'
    },
    {
      status: 'Confirmed',
      label: 'Confirmed',
      description: 'Accepted orders',
      accent: '#3B82F6'
    },
    {
      status: 'Preparing',
      label: 'Preparing',
      description: 'Being prepared',
      accent: '#6366F1'
    },
    {
      status: 'Ready',
      label: 'Ready',
      description: 'Ready for collection',
      accent: '#10B981'
    },
    {
      status: 'Completed',
      label: 'Completed',
      description: 'Fulfilled orders',
      accent: '#059669'
    },
    {
      status: 'Cancelled',
      label: 'Cancelled',
      description: 'Cancelled orders',
      accent: '#EF4444'
    }
  ];

  protected readonly orders = this.orderState.kanbanOrders;
  protected readonly loading = this.orderState.kanbanLoading;
  protected readonly error = this.orderState.kanbanError;
  protected readonly updating = this.orderState.updatingStatus;

  protected readonly cancelOrder = signal<StaffOrderDetails | null>(null);
  protected readonly cancelNotes = signal('');

  protected readonly workflowError = this.orderState.workflowError;

  constructor() {
    effect(() => {
      const restaurantId = this.restaurantId();

      if (restaurantId) {
        untracked(() => {
          this.orderState.loadKanbanOrders(restaurantId);
        });
      }
    });
  }

  protected getOrdersByStatus(
    status: OrderStatus
  ): StaffOrderDetails[] {
    return this.orders()[status] ?? [];
  }

  protected getStatusBorderColor(status: OrderStatus): string {
    return this.columns.find(column => column.status === status)?.accent
      ?? '#CBD5E1';
  }

  protected canTransition(
    currentStatus: OrderStatus,
    nextStatus: OrderStatus
  ): boolean {
    const transitions: Record<OrderStatus, readonly OrderStatus[]> = {
      New: ['Confirmed', 'Cancelled'],
      Confirmed: ['Preparing', 'Cancelled'],
      Preparing: ['Ready', 'Cancelled'],
      Ready: ['Completed', 'Cancelled'],
      Completed: [],
      Cancelled: []
    };

    return transitions[currentStatus].includes(nextStatus);
  }

  protected getNextAction(status: OrderStatus): {
    label: string;
    nextStatus: OrderStatus;
    cssClass: string;
  } | null {
    const actions: Partial<
      Record<OrderStatus, {
        label: string;
        nextStatus: OrderStatus;
        cssClass: string;
      }>
    > = {
      New: {
        label: 'Confirm',
        nextStatus: 'Confirmed',
        cssClass: 'action-confirm'
      },
      Confirmed: {
        label: 'Kitchen',
        nextStatus: 'Preparing',
        cssClass: 'action-kitchen'
      },
      Preparing: {
        label: 'Ready',
        nextStatus: 'Ready',
        cssClass: 'action-ready'
      },
      Ready: {
        label: 'Complete',
        nextStatus: 'Completed',
        cssClass: 'action-complete'
      }
    };

    return actions[status] ?? null;
  }

  protected triggerTransition(
    order: StaffOrderDetails,
    nextStatus: OrderStatus
  ): void {
    if (
      !this.canTransition(order.status, nextStatus) ||
      this.updating()
    ) {
      return;
    }

    this.orderState.transitionOrderStatus(
      this.restaurantId(),
      order.id,
      nextStatus
    );
  }

  protected openCancelModal(order: StaffOrderDetails): void {
    if (
      !this.canTransition(order.status, 'Cancelled') ||
      this.updating()
    ) {
      return;
    }

    this.cancelNotes.set('');
    this.cancelOrder.set(order);
  }

  protected closeCancelModal(): void {
    if (this.updating()) return;

    this.cancelOrder.set(null);
    this.cancelNotes.set('');
  }

  protected confirmCancellation(): void {
    const order = this.cancelOrder();

    if (!order || this.updating()) return;

    this.orderState.transitionOrderStatus(
      this.restaurantId(),
      order.id,
      'Cancelled',
      this.cancelNotes().trim() || null
    );

    this.cancelOrder.set(null);
    this.cancelNotes.set('');
  }

  protected refresh(): void {
    this.orderState.refreshKanban(this.restaurantId());
  }

  protected formatMoney(order: StaffOrderDetails): string {
    return `${order.currency} ${order.totalAmount.toFixed(2)}`;
  }

  protected trackByStatus(
    _index: number,
    column: KanbanColumn
  ): OrderStatus {
    return column.status;
  }

  protected trackByOrder(
    _index: number,
    order: StaffOrderDetails
  ): string {
    return order.id;
  }
}