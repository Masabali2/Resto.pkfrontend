import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';
import { ActiveRestaurantStateService } from './active-restaurant-state.service';
import { AuthStateService } from './auth-state.service';
import {
  TENANT_HEADER,
  tenantInterceptor
} from '../interceptors/tenant.interceptor';
import { environment } from '../../../environments/environment';
import type { ApiResponse } from '../models/api-response.model';
import type { AuthResult } from '../models/auth.model';
import type { RestaurantDto } from '../models/restaurant.model';

const RESTAURANTS_URL = `${environment.apiUrl}/restaurants`;

function buildAuthResult(tenantId: string | null): AuthResult {
  return {
    user: {
      id: 'user-1',
      email: 'owner@resto.pk',
      userName: 'owner',
      platformRoles: []
    },
    memberships: [],
    activeTenant: tenantId
      ? {
          tenantId,
          name: `Tenant ${tenantId}`,
          slug: tenantId,
          roleName: 'Owner'
        }
      : null,
    permissions: []
  };
}

function buildRestaurant(
  overrides: Partial<RestaurantDto> = {}
): RestaurantDto {
  return {
    id: 'restaurant-a',
    tenantId: 'tenant-1',
    name: 'Brewed & Co.',
    description: null,
    phone: null,
    email: null,
    addressLine1: 'Main Road',
    addressLine2: null,
    city: 'Lahore',
    country: 'Pakistan',
    timeZone: 'Asia/Karachi',
    status: 'Active',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: null,
    ...overrides
  };
}

function ok<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
    errorCode: null,
    message: null,
    errors: null,
    traceId: null
  };
}

function page(
  items: RestaurantDto[],
  overrides: Partial<{
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> = {}
) {
  return {
    items,
    totalCount: overrides.totalCount ?? items.length,
    page: overrides.page ?? 1,
    pageSize: overrides.pageSize ?? 100,
    totalPages: overrides.totalPages ?? 1
  };
}

describe('ActiveRestaurantStateService', () => {
  let httpMock: HttpTestingController;
  let authState: AuthStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([tenantInterceptor])),
        provideHttpClientTesting()
      ]
    });

    httpMock = TestBed.inject(HttpTestingController);
    authState = TestBed.inject(AuthStateService);
  });

  afterEach(() => {
    try {
      httpMock.verify();
    } finally {
      TestBed.resetTestingModule();
    }
  });

  function createService(tenantId: string | null): ActiveRestaurantStateService {
    authState.setAuthResult(buildAuthResult(tenantId));

    const service = TestBed.inject(ActiveRestaurantStateService);

    TestBed.tick();

    return service;
  }

  function listRequest(tenantId: string, pageNumber = 1) {
    return httpMock.expectOne(
      request =>
        request.url === RESTAURANTS_URL &&
        request.method === 'GET' &&
        request.params.get('page') === String(pageNumber) &&
        request.headers.get(TENANT_HEADER) === tenantId
    );
  }

  function detailRequest(restaurantId: string) {
    return httpMock.expectOne(
      request =>
        request.url === `${RESTAURANTS_URL}/${restaurantId}` &&
        request.method === 'GET'
    );
  }

  it('does not request anything while there is no active tenant', () => {
    const service = createService(null);

    httpMock.expectNone(request => request.url === RESTAURANTS_URL);

    expect(service.state()).toBe('idle');
    expect(service.restaurant()).toBeNull();
    expect(service.restaurants()).toEqual([]);
  });

  it('reads the restaurants of the active tenant through the tenant interceptor', () => {
    const service = createService('tenant-1');

    const request = listRequest('tenant-1');

    expect(request.request.params.get('pageSize')).toBe('100');
    expect(request.request.params.has('tenantId')).toBe(false);
    expect(request.request.headers.get(TENANT_HEADER)).toBe('tenant-1');

    const active = buildRestaurant({ id: 'restaurant-b', name: 'Karachi Darbar' });
    const closed = buildRestaurant({ id: 'restaurant-a', status: 'Closed' });

    request.flush(ok(page([closed, active])));

    detailRequest(active.id).flush(ok(active));

    expect(service.state()).toBe('resolved');
    expect(service.restaurant()?.id).toBe('restaurant-b');
    expect(service.restaurants().map(item => item.id)).toEqual([
      'restaurant-a',
      'restaurant-b'
    ]);
  });

  it('reads every page of the restaurant list', () => {
    const service = createService('tenant-1');

    const first = buildRestaurant({ id: 'restaurant-a', status: 'Closed' });
    const second = buildRestaurant({ id: 'restaurant-b' });

    listRequest('tenant-1', 1).flush(
      ok(page([first], { totalCount: 2, totalPages: 2, page: 1 }))
    );

    listRequest('tenant-1', 2).flush(
      ok(page([second], { totalCount: 2, totalPages: 2, page: 2 }))
    );

    detailRequest('restaurant-b').flush(ok(second));

    expect(service.restaurants().map(item => item.id)).toEqual([
      'restaurant-a',
      'restaurant-b'
    ]);
    expect(service.restaurant()?.id).toBe('restaurant-b');
  });

  it('reports an empty tenant without inventing a restaurant', () => {
    const service = createService('tenant-1');

    listRequest('tenant-1').flush(ok(page([])));

    expect(service.state()).toBe('empty');
    expect(service.restaurant()).toBeNull();
    expect(service.hasMultipleRestaurants()).toBe(false);
  });

  it('reports a permission problem without inventing a restaurant', () => {
    const service = createService('tenant-1');

    listRequest('tenant-1').flush(null, {
      status: 403,
      statusText: 'Forbidden'
    });

    expect(service.state()).toBe('forbidden');
    expect(service.restaurant()).toBeNull();
  });

  it('clears the selection when the detail request fails', () => {
    const service = createService('tenant-1');
    const restaurant = buildRestaurant();

    listRequest('tenant-1').flush(ok(page([restaurant])));

    detailRequest(restaurant.id).flush(null, {
      status: 404,
      statusText: 'Not Found'
    });

    expect(service.state()).toBe('error');
    expect(service.restaurant()).toBeNull();
    expect(service.errorMessage()).toBeTruthy();
  });

  it('drops the restaurants of the previous tenant when the tenant changes', () => {
    const service = createService('tenant-1');
    const first = buildRestaurant({ id: 'restaurant-a' });

    listRequest('tenant-1').flush(ok(page([first])));
    detailRequest(first.id).flush(ok(first));

    expect(service.restaurant()?.id).toBe('restaurant-a');

    authState.setAuthResult(buildAuthResult('tenant-2'));
    TestBed.tick();

    expect(service.restaurant()).toBeNull();
    expect(service.restaurants()).toEqual([]);
    expect(service.state()).toBe('loading');
    expect(service.activeTenantId()).toBe('tenant-2');

    const second = buildRestaurant({ id: 'restaurant-b', tenantId: 'tenant-2' });

    listRequest('tenant-2').flush(ok(page([second])));
    detailRequest(second.id).flush(ok(second));

    expect(service.restaurant()?.id).toBe('restaurant-b');
  });

  it('ignores a stale answer of a previous tenant', () => {
    const service = createService('tenant-1');
    const first = buildRestaurant({ id: 'restaurant-a' });

    listRequest('tenant-1').flush(ok(page([first])));
    detailRequest(first.id).flush(ok(first));

    // A refresh of the previous tenant is still running.
    service.refresh();
    const staleList = listRequest('tenant-1');

    // The user moves to another tenant.
    authState.setAuthResult(buildAuthResult('tenant-2'));
    TestBed.tick();

    const currentList = listRequest('tenant-2');

    expect(service.restaurant()).toBeNull();

    // The late answer of the previous tenant arrives.
    staleList.flush(ok(page([first])));
    detailRequest(first.id).flush(ok(first));

    expect(service.restaurant()).toBeNull();

    // The current tenant resolves normally.
    const second = buildRestaurant({ id: 'restaurant-b', tenantId: 'tenant-2' });

    currentList.flush(ok(page([second])));
    detailRequest(second.id).flush(ok(second));

    expect(service.restaurant()?.id).toBe('restaurant-b');
  });

  it('moves the selection inside the active tenant', () => {
    const service = createService('tenant-1');
    const first = buildRestaurant({ id: 'restaurant-a' });
    const second = buildRestaurant({ id: 'restaurant-b', name: 'Karachi Darbar' });

    listRequest('tenant-1').flush(ok(page([first, second])));
    detailRequest(first.id).flush(ok(first));

    expect(service.restaurant()?.id).toBe('restaurant-a');
    expect(service.hasMultipleRestaurants()).toBe(true);

    service.selectRestaurant(second.id);

    detailRequest(second.id).flush(ok(second));

    expect(service.restaurant()?.id).toBe('restaurant-b');
    expect(service.activeTenantId()).toBe('tenant-1');
  });

  it('keeps the selection when it is still part of the fresh list', () => {
    const service = createService('tenant-1');
    const first = buildRestaurant({ id: 'restaurant-a' });
    const second = buildRestaurant({ id: 'restaurant-b' });

    listRequest('tenant-1').flush(ok(page([first, second])));
    detailRequest(first.id).flush(ok(first));

    service.selectRestaurant(second.id);
    detailRequest(second.id).flush(ok(second));

    service.refresh();

    listRequest('tenant-1').flush(ok(page([first, second])));
    detailRequest(second.id).flush(ok(second));

    expect(service.restaurant()?.id).toBe('restaurant-b');
  });

  it('falls back to an active restaurant when the selection is gone', () => {
    const service = createService('tenant-1');
    const first = buildRestaurant({ id: 'restaurant-a' });
    const second = buildRestaurant({ id: 'restaurant-b' });

    listRequest('tenant-1').flush(ok(page([first, second])));
    detailRequest(first.id).flush(ok(first));

    service.selectRestaurant(second.id);
    detailRequest(second.id).flush(ok(second));

    service.refresh();

    const closed = buildRestaurant({ id: 'restaurant-a', status: 'Closed' });

    listRequest('tenant-1').flush(ok(page([closed])));
    detailRequest(closed.id).flush(ok(closed));

    expect(service.restaurant()?.id).toBe('restaurant-a');
  });
});
