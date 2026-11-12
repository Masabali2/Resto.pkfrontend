import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { ActiveRestaurantStateService } from '../../../../../core/services/active-restaurant-state.service';
import { AuthorizationService } from '../../../../../core/services/authorization.service';
import { HttpErrorHandlerService } from '../../../../../core/services/http-error-handler.service';
import { OrderApiService } from '../../../services/order-api.service';
import { OrderStateService } from '../../../services/order-state.service';
import { OrderDetails } from './order-details';

const order = {
  id: 'order-123',
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
  items: [{
    menuItemId: 'menu-item-1',
    itemName: 'Chicken Burger',
    unitPrice: 850,
    quantity: 1,
    lineTotal: 850,
    currency: 'PKR'
  }]
};

function createRoute() {
  return {
    snapshot: { paramMap: convertToParamMap({ orderId: 'order-123' }) },
    paramMap: of(convertToParamMap({ orderId: 'order-123' }))
  };
}

function createRestaurantProvider() {
  const restaurant = signal({ id: 'restaurant-1', name: 'Test Restaurant' });
  return {
    provider: {
      provide: ActiveRestaurantStateService,
      useValue: { restaurant: restaurant.asReadonly() }
    }
  };
}

describe('OrderDetails', () => {
  it('loads an order and sends workflow transitions when Order.Update is granted', async () => {
    const updatedOrder = { ...order, status: 'Confirmed' };
    const orderApi = {
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
        data: updatedOrder,
        errorCode: null,
        message: null,
        errors: null,
        traceId: null
      })),
      getStaffOrders: vi.fn()
    };
    const restaurantProvider = createRestaurantProvider();

    await TestBed.configureTestingModule({
      imports: [OrderDetails],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: createRoute() },
        restaurantProvider.provider,
        { provide: AuthorizationService, useValue: { hasPermission: vi.fn().mockReturnValue(true) } },
        { provide: OrderApiService, useValue: orderApi },
        { provide: HttpErrorHandlerService, useValue: { handle: vi.fn() } }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(OrderDetails);
    fixture.detectChanges();

    expect(orderApi.getStaffOrder).toHaveBeenCalledWith('restaurant-1', 'order-123');
    expect(fixture.nativeElement.textContent).toContain('RST-2026-001');

    const confirmButton = Array.from(
      fixture.nativeElement.querySelectorAll('.workflow-action') as NodeListOf<Element>
    ).find(button => button.textContent?.includes('Mark as Confirmed')) as HTMLButtonElement;

    expect(confirmButton).toBeTruthy();
    confirmButton.click();
    fixture.detectChanges();

    expect(orderApi.updateStaffOrderStatus).toHaveBeenCalledWith(
      'restaurant-1',
      'order-123',
      { status: 'Confirmed', notes: null }
    );
    expect(fixture.nativeElement.textContent).toContain('Confirmed');
  });

  it('keeps order details read-only and blocks transitions without Order.Update', async () => {
    const orderState = {
      selectedOrder: signal(order),
      detailLoading: signal(false),
      detailMessage: signal<string | null>(null),
      updatingStatus: signal(false),
      loadOrder: vi.fn(),
      clear: vi.fn(),
      transitionStatus: vi.fn()
    };
    const restaurantProvider = createRestaurantProvider();

    await TestBed.configureTestingModule({
      imports: [OrderDetails],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: createRoute() },
        restaurantProvider.provider,
        { provide: AuthorizationService, useValue: { hasPermission: vi.fn().mockReturnValue(false) } },
        { provide: OrderStateService, useValue: orderState }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(OrderDetails);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.workflow-action')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('read-only access');

    (fixture.componentInstance as unknown as { transitionStatus: (status: 'Confirmed') => void })
      .transitionStatus('Confirmed');

    expect(orderState.transitionStatus).not.toHaveBeenCalled();
  });
});