import { describe, expect, it } from 'vitest';
import {
  getNextOrderStatuses,
  getOrderStatusStep,
  isTerminalOrderStatus,
  ORDER_STATUS_STEPS
} from './order-status.util';

describe('order status utilities', () => {
  it('defines the supported fulfilment progression', () => {
    expect(ORDER_STATUS_STEPS).toEqual([
      'New',
      'Confirmed',
      'Preparing',
      'Ready',
      'Completed'
    ]);
  });

  it('returns only the valid next status transitions', () => {
    expect(getNextOrderStatuses('New')).toEqual(['Confirmed', 'Cancelled']);
    expect(getNextOrderStatuses('Confirmed')).toEqual(['Preparing', 'Cancelled']);
    expect(getNextOrderStatuses('Preparing')).toEqual(['Ready', 'Cancelled']);
    expect(getNextOrderStatuses('Ready')).toEqual(['Completed', 'Cancelled']);
  });

  it('does not allow transitions from terminal statuses', () => {
    expect(getNextOrderStatuses('Completed')).toEqual([]);
    expect(getNextOrderStatuses('Cancelled')).toEqual([]);
    expect(isTerminalOrderStatus('Completed')).toBe(true);
    expect(isTerminalOrderStatus('Cancelled')).toBe(true);
  });

  it('returns the active progress position for each non-cancelled status', () => {
    expect(getOrderStatusStep('New')).toBe(0);
    expect(getOrderStatusStep('Confirmed')).toBe(1);
    expect(getOrderStatusStep('Preparing')).toBe(2);
    expect(getOrderStatusStep('Ready')).toBe(3);
    expect(getOrderStatusStep('Completed')).toBe(4);
  });
});
