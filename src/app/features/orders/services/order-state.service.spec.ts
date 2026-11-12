import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { vi } from 'vitest';
import { HttpErrorHandlerService } from '../../../core/services/http-error-handler.service';
import { OrderApiService } from './order-api.service';
import { OrderStateService } from './order-state.service';

describe('OrderStateService', () => {
  const order = {
    id: 'order-1',
    orderNumber: 'RST-2026-001',
    status: 'New',
    orderType: 'Pickup',
    customerName: 'Test Customer',
    customerPhone: null,
    customerEmail: null,
    subtotal: 850,
    discountAmount: 0,
    taxAmount: 0,
    totalAmount: 850,
    currency: 'PKR',
    specialInstructions: null,
    createdAt: '2026-11-06T10:00:00Z',
    completedAt: null,
    cancelledAt: null,
    items: []
  };

  type TestOrder = typeof order;

  const pageResponse = (items: TestOrder[]) => ({
    success: true,
    data: {
      items,
      page: 1,
      pageSize: 20,
      totalCount: items.length,
      totalPages: Math.max(1, Math.ceil(items.length / 20)),
      hasPreviousPage: false,
      hasNextPage: false
    },
    errorCode: null,
    message: null,
    errors: null,
    traceId: null
  });

  async function createState(orderApi: Record<string, ReturnType<typeof vi.fn>>) {
    const defaultApi = {
      getStaffOrderSummary: vi.fn().mockReturnValue(of({
        success: true,
        data: { totalOrders: 0, pendingKitchen: 0, completedToday: 0, totalRevenue: 0, currency: 'PKR' },
        errorCode: null,
        message: null,
        errors: null,
        traceId: null
      })),
      ...orderApi
    };
    await TestBed.configureTestingModule({
      providers: [
        { provide: OrderApiService, useValue: defaultApi },
        { provide: HttpErrorHandlerService, useValue: { handle: vi.fn().mockReturnValue({ message: 'Request failed.' }) } }
      ]
    });

    return TestBed.inject(OrderStateService);
  }

  it('loads and exposes paged orders for the selected restaurant', async () => {
    const orderApi = {
      getStaffOrders: vi.fn().mockReturnValue(of(pageResponse([order]))),
      getStaffOrder: vi.fn(),
      updateStaffOrderStatus: vi.fn()
    };
    const state = await createState(orderApi);

    state.loadOrders('restaurant-1');

    expect(orderApi.getStaffOrders).toHaveBeenCalledWith('restaurant-1', null, null, 1, 20);
    expect(state.orders()).toEqual([order]);
    expect(state.totalCount()).toBe(1);
    expect(state.totalPages()).toBe(1);
    expect(state.listLoading()).toBe(false);
  });

  it('synchronizes the selected order and filtered list after a server-confirmed transition', async () => {
    const confirmedOrder = { ...order, status: 'Confirmed' };
    const orderApi = {
      getStaffOrders: vi.fn()
        .mockReturnValueOnce(of(pageResponse([order])))
        .mockReturnValueOnce(of(pageResponse([order])))
        .mockReturnValue(of(pageResponse([]))),
      getStaffOrder: vi.fn().mockReturnValue(of({
        success: true,
        data: order,
        errorCode: null,
        message: null,
        errors: null,
        traceId: null
      })),
      updateStaffOrderStatus: vi.fn().mockReturnValue(of({
        success: true,
        data: confirmedOrder,
        errorCode: null,
        message: null,
        errors: null,
        traceId: null
      }))
    };
    const state = await createState(orderApi);

    state.loadOrders('restaurant-1');
    state.setStatusFilter('restaurant-1', 'New');
    state.loadOrder('restaurant-1', 'order-1');
    state.transitionStatus('restaurant-1', 'Confirmed');

    expect(orderApi.updateStaffOrderStatus).toHaveBeenCalledWith(
      'restaurant-1',
      'order-1',
      { status: 'Confirmed', notes: null }
    );
    expect(state.selectedOrder()?.status).toBe('Confirmed');
    expect(state.orders()).toEqual([]);
    expect(state.totalCount()).toBe(0);
    expect(state.updatingStatus()).toBe(false);
  });

  it('prevents a second status mutation while the first transition is pending', async () => {
    const pendingResponse = new Subject<{
      success: boolean;
      data: typeof order;
      errorCode: null;
      message: null;
      errors: null;
      traceId: null;
    }>();
    const confirmedOrder = { ...order, status: 'Confirmed' };
    const orderApi = {
      getStaffOrders: vi.fn(),
      getStaffOrder: vi.fn().mockReturnValue(of({
        success: true,
        data: order,
        errorCode: null,
        message: null,
        errors: null,
        traceId: null
      })),
      updateStaffOrderStatus: vi.fn().mockReturnValue(pendingResponse)
    };
    const state = await createState(orderApi);

    state.loadOrder('restaurant-1', 'order-1');
    state.transitionStatus('restaurant-1', 'Confirmed');
    state.transitionStatus('restaurant-1', 'Preparing');

    expect(orderApi.updateStaffOrderStatus).toHaveBeenCalledTimes(1);
    expect(state.updatingStatus()).toBe(true);

    pendingResponse.next({
      success: true,
      data: confirmedOrder,
      errorCode: null,
      message: null,
      errors: null,
      traceId: null
    });
    pendingResponse.complete();

    expect(state.selectedOrder()?.status).toBe('Confirmed');
    expect(state.updatingStatus()).toBe(false);
  });

  it('ignores a stale list response after switching restaurants', async () => {
    const staleResponse = new Subject<ReturnType<typeof pageResponse>>();
    const currentOrder = { ...order, id: 'order-2', orderNumber: 'RST-2026-002' };
    const orderApi = {
      getStaffOrders: vi.fn()
        .mockReturnValueOnce(staleResponse)
        .mockReturnValueOnce(of(pageResponse([currentOrder]))),
      getStaffOrder: vi.fn(),
      updateStaffOrderStatus: vi.fn()
    };
    const state = await createState(orderApi);

    state.loadOrders('restaurant-old');
    state.loadOrders('restaurant-current');
    staleResponse.next(pageResponse([order]));

    expect(state.restaurantId()).toBe('restaurant-current');
    expect(state.orders()).toEqual([currentOrder]);
  });
});