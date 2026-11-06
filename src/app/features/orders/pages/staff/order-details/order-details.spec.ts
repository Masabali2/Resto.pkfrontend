import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { ActiveRestaurantStateService } from '../../../../../core/services/active-restaurant-state.service';
import { HttpErrorHandlerService } from '../../../../../core/services/http-error-handler.service';
import { OrderApiService } from '../../../services/order-api.service';
import { OrderDetails } from './order-details';

describe('OrderDetails', () => {
  it('loads an order and sends workflow transitions to the API', async () => {
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
      }))
    };
    const restaurant = signal({ id: 'restaurant-1', name: 'Test Restaurant' });
    const route = {
      snapshot: { paramMap: convertToParamMap({ orderId: 'order-123' }) },
      paramMap: of(convertToParamMap({ orderId: 'order-123' }))
    };

    await TestBed.configureTestingModule({
      imports: [OrderDetails],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: route },
        { provide: ActiveRestaurantStateService, useValue: { restaurant: restaurant.asReadonly() } },
        { provide: OrderApiService, useValue: orderApi },
        { provide: HttpErrorHandlerService, useValue: { handle: vi.fn() } }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(OrderDetails);
    fixture.detectChanges();

    expect(orderApi.getStaffOrder).toHaveBeenCalledWith('restaurant-1', 'order-123');
    expect(fixture.nativeElement.textContent).toContain('RST-2026-001');

    const confirmButton = Array.from(
      fixture.nativeElement.querySelectorAll('.workflow-action')
    ).find((button: Element) => button.textContent?.includes('Mark as Confirmed')) as HTMLButtonElement;

    expect(confirmButton).toBeTruthy();
    confirmButton.click();
    fixture.detectChanges();

    expect(orderApi.updateStaffOrderStatus).toHaveBeenCalledWith(
      'restaurant-1',
      'order-123',
      { newStatus: 'Confirmed', notes: null }
    );
    expect(fixture.nativeElement.textContent).toContain('Confirmed');
  });
});