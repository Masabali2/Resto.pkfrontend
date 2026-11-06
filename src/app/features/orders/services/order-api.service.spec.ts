import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../../environments/environment';
import { OrderApiService } from './order-api.service';

describe('OrderApiService', () => {
  let service: OrderApiService;
  let http: HttpTestingController;
  const publicBase = environment.apiUrl + '/v1/public/restaurants';
  const staffBase = environment.apiUrl + '/restaurants';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(OrderApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('requests paged staff orders with the supplied filters', () => {
    service.getStaffOrders('restaurant-1', 'Preparing', 2, 10).subscribe();

    const request = http.expectOne(req => req.url === staffBase + '/restaurant-1/orders');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys()).toEqual(['page', 'pageSize', 'status']);
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('pageSize')).toBe('10');
    expect(request.request.params.get('status')).toBe('Preparing');
    request.flush({});
  });

  it('requests a staff order and sends status transitions using the expected contract', () => {
    service.getStaffOrder('restaurant-1', 'order-1').subscribe();
    const detail = http.expectOne(staffBase + '/restaurant-1/orders/order-1');
    expect(detail.request.method).toBe('GET');
    detail.flush({});

    const body = { newStatus: 'Confirmed' as const, notes: 'Accepted by kitchen' };
    service.updateStaffOrderStatus('restaurant-1', 'order-1', body).subscribe();
    const update = http.expectOne(staffBase + '/restaurant-1/orders/order-1/status');
    expect(update.request.method).toBe('PATCH');
    expect(update.request.body).toEqual(body);
    update.flush({});
  });

  it('encodes restaurant slugs and uses the public cart endpoints', () => {
    const slug = 'cafe & grill';
    const base = publicBase + '/cafe%20%26%20grill';

    service.getCart(slug).subscribe();
    const get = http.expectOne(base + '/cart');
    expect(get.request.method).toBe('GET');
    get.flush({});

    service.addCartItem(slug, 'menu-item-1', 2).subscribe();
    const add = http.expectOne(base + '/cart/items');
    expect(add.request.method).toBe('POST');
    expect(add.request.body).toEqual({ menuItemId: 'menu-item-1', quantity: 2 });
    add.flush({});

    service.updateCartItem(slug, 'cart-item-1', 3).subscribe();
    const update = http.expectOne(base + '/cart/items/cart-item-1');
    expect(update.request.method).toBe('PUT');
    expect(update.request.body).toEqual({ quantity: 3 });
    update.flush({});

    service.removeCartItem(slug, 'cart-item-1').subscribe();
    const remove = http.expectOne(base + '/cart/items/cart-item-1');
    expect(remove.request.method).toBe('DELETE');
    remove.flush({});

    service.clearCart(slug).subscribe();
    const clear = http.expectOne(base + '/cart');
    expect(clear.request.method).toBe('DELETE');
    clear.flush({});
  });

  it('uses the public order creation endpoints without sending client-calculated totals', () => {
    const request = {
      orderType: 'Pickup' as const,
      customerName: 'Test Customer',
      customerPhone: null,
      customerEmail: null,
      specialInstructions: null
    };

    service.createOrder('sample-restaurant', request).subscribe();
    const create = http.expectOne(publicBase + '/sample-restaurant/orders');
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual(request);
    expect(create.request.body).not.toHaveProperty('totalAmount');
    create.flush({});

    const directRequest = {
      ...request,
      items: [{ menuItemId: 'menu-item-1', quantity: 2 }]
    };
    service.createDirectOrder('sample-restaurant', directRequest).subscribe();
    const direct = http.expectOne(publicBase + '/sample-restaurant/orders/direct');
    expect(direct.request.method).toBe('POST');
    expect(direct.request.body).toEqual(directRequest);
    direct.flush({});
  });

  it('encodes the public tracking token in the tracking request', () => {
    service.trackOrder('sample-restaurant', 'token/with+reserved=chars').subscribe();

    const request = http.expectOne(
      publicBase + '/sample-restaurant/orders/track/token%2Fwith%2Breserved%3Dchars'
    );
    expect(request.request.method).toBe('GET');
    request.flush({});
  });
});
