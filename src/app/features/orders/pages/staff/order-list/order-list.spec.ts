import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { ActiveRestaurantStateService } from '../../../../../core/services/active-restaurant-state.service';
import { HttpErrorHandlerService } from '../../../../../core/services/http-error-handler.service';
import { OrderApiService } from '../../../services/order-api.service';
import { OrderList } from './order-list';

describe('OrderList', () => {
  it('loads the selected restaurant orders from the API', async () => {
    const restaurant = signal({ id: 'restaurant-1', name: 'Test Restaurant' });
    const restaurantState = signal<'resolved' | 'loading' | 'empty' | 'error' | 'forbidden'>('resolved');
    const errorMessage = signal<string | null>(null);
    const orderApi = {
      getStaffOrders: vi.fn().mockReturnValue(of({
        success: true,
        data: {
          items: [],
          page: 1,
          pageSize: 20,
          totalCount: 0,
          totalPages: 0,
          hasPreviousPage: false,
          hasNextPage: false
        },
        errorCode: null,
        message: null,
        errors: null,
        traceId: null
      }))
    };

    await TestBed.configureTestingModule({
      imports: [OrderList],
      providers: [
        provideRouter([]),
        {
          provide: ActiveRestaurantStateService,
          useValue: {
            restaurant: restaurant.asReadonly(),
            state: restaurantState.asReadonly(),
            errorMessage: errorMessage.asReadonly(),
            refresh: vi.fn()
          }
        },
        { provide: OrderApiService, useValue: orderApi },
        { provide: HttpErrorHandlerService, useValue: { handle: vi.fn() } }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(OrderList);
    fixture.detectChanges();

    expect(orderApi.getStaffOrders).toHaveBeenCalledWith('restaurant-1', null, 1, 20);
    expect(fixture.nativeElement.textContent).toContain('Test Restaurant');
    expect(fixture.nativeElement.textContent).toContain('No orders found');
  });
});