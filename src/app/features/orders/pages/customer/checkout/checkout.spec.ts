import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { HttpErrorHandlerService } from '../../../../../core/services/http-error-handler.service';
import { OrderApiService } from '../../../services/order-api.service';
import { PublicCheckout } from './checkout';

describe('PublicCheckout', () => {
  it('loads the cart and renders checkout fields with the server total', async () => {
    const cart = {
      id: 'cart-1',
      restaurantId: 'restaurant-1',
      itemCount: 1,
      totalAmount: 850,
      currency: 'PKR',
      expiresAt: '2026-11-07T00:00:00Z',
      items: [{
        id: 'cart-item-1',
        menuItemId: 'menu-item-1',
        itemName: 'Chicken Burger',
        unitPrice: 850,
        quantity: 1,
        currency: 'PKR',
        lineTotal: 850
      }]
    };
    const orderApi = {
      getCart: vi.fn().mockReturnValue(of({
        success: true,
        data: cart,
        errorCode: null,
        message: null,
        errors: null,
        traceId: null
      })),
      createOrder: vi.fn()
    };
    const route = {
      snapshot: { paramMap: convertToParamMap({ slug: 'sample-restaurant' }) },
      paramMap: of(convertToParamMap({ slug: 'sample-restaurant' }))
    };

    await TestBed.configureTestingModule({
      imports: [PublicCheckout],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: route },
        { provide: OrderApiService, useValue: orderApi },
        { provide: HttpErrorHandlerService, useValue: { handle: vi.fn() } }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(PublicCheckout);
    fixture.detectChanges();

    expect(orderApi.getCart).toHaveBeenCalledWith('sample-restaurant');
    expect(fixture.nativeElement.textContent).toContain('Customer details');
    expect(fixture.nativeElement.textContent).toContain('Pickup');
    expect(fixture.nativeElement.textContent).toContain('Dine-in');
    expect(fixture.nativeElement.textContent).toContain('Delivery');
    expect(fixture.nativeElement.textContent).toContain('850.00');
    expect(fixture.nativeElement.querySelector('button[type="submit"]')?.disabled).toBe(true);
  });
});