import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { HttpErrorHandlerService } from '../../../../../core/services/http-error-handler.service';
import { OrderApiService } from '../../../services/order-api.service';
import { PublicCart } from './cart';

describe('PublicCart', () => {
  it('loads the current restaurant cart from the API and renders its empty state', async () => {
    const cart = {
      id: 'cart-1',
      restaurantId: 'restaurant-1',
      itemCount: 0,
      totalAmount: 0,
      currency: 'PKR',
      expiresAt: '2026-11-07T00:00:00Z',
      items: []
    };
    const orderApi = {
      getCart: vi.fn().mockReturnValue(of({
        success: true,
        data: cart,
        errorCode: null,
        message: null,
        errors: null,
        traceId: null
      }))
    };
    const route = {
      snapshot: { paramMap: convertToParamMap({ slug: 'sample-restaurant' }) },
      paramMap: of(convertToParamMap({ slug: 'sample-restaurant' }))
    };

    await TestBed.configureTestingModule({
      imports: [PublicCart],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: route },
        { provide: OrderApiService, useValue: orderApi },
        { provide: HttpErrorHandlerService, useValue: { handle: vi.fn() } }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(PublicCart);
    fixture.detectChanges();

    expect(orderApi.getCart).toHaveBeenCalledWith('sample-restaurant');
    expect(fixture.nativeElement.textContent).toContain('Your cart is empty');
    expect(fixture.nativeElement.querySelectorAll('.cart-item')).toHaveLength(0);
  });
});