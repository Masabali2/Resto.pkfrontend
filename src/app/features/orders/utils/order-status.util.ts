import type { OrderStatus } from '../models/order.models';

export const ORDER_STATUS_STEPS: readonly OrderStatus[] = [
  'New',
  'Confirmed',
  'Preparing',
  'Ready',
  'Completed'
];

export function getNextOrderStatuses(status: OrderStatus): readonly OrderStatus[] {
  switch (status) {
    case 'New': return ['Confirmed', 'Cancelled'];
    case 'Confirmed': return ['Preparing', 'Cancelled'];
    case 'Preparing': return ['Ready', 'Cancelled'];
    case 'Ready': return ['Completed', 'Cancelled'];
    case 'Completed':
    case 'Cancelled': return [];
  }
}

export function getOrderStatusStep(status: OrderStatus): number {
  return ORDER_STATUS_STEPS.indexOf(status);
}

export function isTerminalOrderStatus(status: OrderStatus): boolean {
  return status === 'Completed' || status === 'Cancelled';
}
