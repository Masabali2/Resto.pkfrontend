import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { vi } from 'vitest';
import { HttpErrorHandlerService } from '../../../core/services/http-error-handler.service';
import { OrderApiService } from './order-api.service';
import { PublicOrderStateService } from './public-order-state.service';

describe('PublicOrderStateService', () => {
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

  const cartResponse = (data: typeof cart) => ({
    success: true,
    data,
    errorCode: null,
    message: null,
    errors: null,
    traceId: null
  });

  async function createState(orderApi: Record<string, ReturnType<typeof vi.fn>>) {
    await TestBed.configureTestingModule({
      providers: [
        { provide: OrderApiService, useValue: orderApi },
        { provide: HttpErrorHandlerService, useValue: { handle: vi.fn().mockReturnValue({ message: 'Request failed.' }) } }
      ]
    });

    return TestBed.inject(PublicOrderStateService);
  }

  it('loads a cart once and reuses the same restaurant-scoped state', async () => {
    const orderApi = {
      getCart: vi.fn().mockReturnValue(of(cartResponse(cart))),
      addCartItem: vi.fn(),
      updateCartItem: vi.fn(),
      removeCartItem: vi.fn(),
      clearCart: vi.fn(),
      createOrder: vi.fn(),
      trackOrder: vi.fn()
    };
    const state = await createState(orderApi);

    state.loadCart('sample-restaurant');
    state.loadCart('sample-restaurant');

    expect(orderApi.getCart).toHaveBeenCalledTimes(1);
    expect(state.cartSlug()).toBe('sample-restaurant');
    expect(state.cart()).toEqual(cart);
    expect(state.cartLoading()).toBe(false);
  });

  it('refreshes the shared cart after a successful item mutation', async () => {
    const updatedCart = {
      ...cart,
      itemCount: 2,
      totalAmount: 1700,
      items: [{ ...cart.items[0], quantity: 2, lineTotal: 1700 }]
    };
    const orderApi = {
      getCart: vi.fn()
        .mockReturnValueOnce(of(cartResponse(cart)))
        .mockReturnValueOnce(of(cartResponse(updatedCart))),
      addCartItem: vi.fn(),
      updateCartItem: vi.fn().mockReturnValue(of({
        success: true,
        data: { ...cart.items[0], quantity: 2 },
        errorCode: null,
        message: null,
        errors: null,
        traceId: null
      })),
      removeCartItem: vi.fn(),
      clearCart: vi.fn(),
      createOrder: vi.fn(),
      trackOrder: vi.fn()
    };
    const state = await createState(orderApi);

    state.loadCart('sample-restaurant');
    state.updateCartItem('sample-restaurant', 'cart-item-1', 2);

    expect(orderApi.updateCartItem).toHaveBeenCalledWith('sample-restaurant', 'cart-item-1', 2);
    expect(orderApi.getCart).toHaveBeenCalledTimes(2);
    expect(state.cart()?.items[0].quantity).toBe(2);
    expect(state.cartMutating()).toBe(false);
  });

  it('prevents duplicate cart mutations while refreshing the shared cart', async () => {
    const pendingMutation = new Subject<ReturnType<typeof cartResponse>>();
    const updatedCart = {
      ...cart,
      itemCount: 2,
      totalAmount: 1700,
      items: [{ ...cart.items[0], quantity: 2, lineTotal: 1700 }]
    };
    const orderApi = {
      getCart: vi.fn()
        .mockReturnValueOnce(of(cartResponse(cart)))
        .mockReturnValue(of(cartResponse(updatedCart))),
      addCartItem: vi.fn(),
      updateCartItem: vi.fn().mockReturnValue(pendingMutation),
      removeCartItem: vi.fn(),
      clearCart: vi.fn(),
      createOrder: vi.fn(),
      trackOrder: vi.fn()
    };
    const state = await createState(orderApi);

    state.loadCart('sample-restaurant');
    state.updateCartItem('sample-restaurant', 'cart-item-1', 2);
    state.updateCartItem('sample-restaurant', 'cart-item-1', 3);

    expect(orderApi.updateCartItem).toHaveBeenCalledTimes(1);
    expect(state.cartMutating()).toBe(true);

    pendingMutation.next(cartResponse(cart));
    pendingMutation.complete();

    expect(state.cart()?.items[0].quantity).toBe(2);
    expect(state.cartMutating()).toBe(false);
  });

  it('ignores a stale cart response after switching restaurant slugs', async () => {
    const staleResponse = new Subject<ReturnType<typeof cartResponse>>();
    const currentCart = { ...cart, id: 'cart-2', restaurantId: 'restaurant-2' };
    const orderApi = {
      getCart: vi.fn()
        .mockReturnValueOnce(staleResponse)
        .mockReturnValueOnce(of(cartResponse(currentCart))),
      addCartItem: vi.fn(),
      updateCartItem: vi.fn(),
      removeCartItem: vi.fn(),
      clearCart: vi.fn(),
      createOrder: vi.fn(),
      trackOrder: vi.fn()
    };
    const state = await createState(orderApi);

    state.loadCart('old-restaurant');
    state.loadCart('current-restaurant');
    staleResponse.next(cartResponse(cart));

    expect(state.cartSlug()).toBe('current-restaurant');
    expect(state.cart()).toEqual(currentCart);
  });

  it('prevents duplicate order creation while the first request is pending', async () => {
    const orderResponse = new Subject<{
      success: boolean;
      data: {
        id: string;
        orderNumber: string;
        status: string;
        orderType: string;
        totalAmount: number;
        currency: string;
        rawTrackingToken: string;
        items: [];
        createdAt: string;
      };
      errorCode: null;
      message: null;
      errors: null;
      traceId: null;
    }>();
    const orderApi = {
      getCart: vi.fn(),
      addCartItem: vi.fn(),
      updateCartItem: vi.fn(),
      removeCartItem: vi.fn(),
      clearCart: vi.fn(),
      createOrder: vi.fn().mockReturnValue(orderResponse),
      trackOrder: vi.fn()
    };
    const state = await createState(orderApi);
    const request = {
      orderType: 'Pickup' as const,
      customerName: 'Test Customer',
      customerPhone: null,
      customerEmail: null,
      specialInstructions: null
    };

    state.createOrder('sample-restaurant', request).subscribe();
    state.createOrder('sample-restaurant', request).subscribe();

    expect(orderApi.createOrder).toHaveBeenCalledTimes(1);
    expect(state.creatingOrder()).toBe(true);

    orderResponse.next({
      success: true,
      data: {
        id: 'order-1',
        orderNumber: 'RST-2026-001',
        status: 'New',
        orderType: 'Pickup',
        totalAmount: 850,
        currency: 'PKR',
        rawTrackingToken: 'one-time-token',
        items: [],
        createdAt: '2026-11-06T10:00:00Z'
      },
      errorCode: null,
      message: null,
      errors: null,
      traceId: null
    });
    orderResponse.complete();

    expect(state.creatingOrder()).toBe(false);
    expect(state.cart()).toBeNull();
  });

  it('loads tracking details without storing the raw tracking token in state', async () => {
    const tracking = {
      orderNumber: 'RST-2026-001',
      status: 'Preparing',
      totalAmount: 850,
      currency: 'PKR',
      items: [{ itemName: 'Chicken Burger', quantity: 1 }],
      createdAt: '2026-11-06T10:00:00Z',
      completedAt: null
    };
    const orderApi = {
      getCart: vi.fn(),
      addCartItem: vi.fn(),
      updateCartItem: vi.fn(),
      removeCartItem: vi.fn(),
      clearCart: vi.fn(),
      createOrder: vi.fn(),
      trackOrder: vi.fn().mockReturnValue(of({
        success: true,
        data: tracking,
        errorCode: null,
        message: null,
        errors: null,
        traceId: null
      }))
    };
    const state = await createState(orderApi);

    state.loadTracking('sample-restaurant', 'one-time-token');

    expect(orderApi.trackOrder).toHaveBeenCalledWith('sample-restaurant', 'one-time-token');
    expect(state.trackingOrder()).toEqual(tracking);
    expect(state.trackingLoading()).toBe(false);
    expect(state.trackingError()).toBeNull();
    expect(Object.keys(state).some(key => key.toLowerCase().includes('token'))).toBe(false);
  });
});