import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { RestaurantService } from './restaurant.service';
import { environment } from '../../../environments/environment';
import type { ApiResponse } from '../models/api-response.model';
import type { PagedResult } from '../models/paged-result.model';
import type { RestaurantDto } from '../models/restaurant.model';

const RESTAURANTS_URL = `${environment.apiUrl}/restaurants`;

function buildRestaurant(overrides: Partial<RestaurantDto> = {}): RestaurantDto {
  return {
    id: 'restaurant-1',
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

describe('RestaurantService', () => {
  let service: RestaurantService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });

    service = TestBed.inject(RestaurantService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    try {
      httpMock.verify();
    } finally {
      TestBed.resetTestingModule();
    }
  });

  it('lists the restaurants of the active tenant with paging parameters', () => {
    service.getRestaurants(1, 100).subscribe();

    const req = httpMock.expectOne(
      request => request.url === RESTAURANTS_URL && request.method === 'GET'
    );

    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('pageSize')).toBe('100');
    expect(req.request.params.has('tenantId')).toBe(false);

    req.flush({
      success: true,
      data: {
        items: [buildRestaurant()],
        totalCount: 1,
        page: 1,
        pageSize: 100,
        totalPages: 1
      },
      errorCode: null,
      message: null,
      errors: null,
      traceId: null
    } as ApiResponse<PagedResult<RestaurantDto>>);
  });

  it('reads a single restaurant by its id', () => {
    service.getRestaurantById('restaurant-1').subscribe();

    const req = httpMock.expectOne(
      request =>
        request.url === `${RESTAURANTS_URL}/restaurant-1` &&
        request.method === 'GET'
    );

    expect(req.request.params.has('tenantId')).toBe(false);

    req.flush({
      success: true,
      data: buildRestaurant(),
      errorCode: null,
      message: null,
      errors: null,
      traceId: null
    } as ApiResponse<RestaurantDto>);
  });

  it('never sends a tenant id in the body of a request', () => {
    service.createRestaurant({
      name: 'Brewed & Co.',
      description: null,
      phone: null,
      email: null,
      address: {
        line1: 'Main Road',
        line2: null,
        city: 'Lahore',
        country: 'Pakistan',
        postalCode: null
      },
      timeZone: 'Asia/Karachi'
    }).subscribe();

    const req = httpMock.expectOne(
      request => request.url === RESTAURANTS_URL && request.method === 'POST'
    );

    expect(Object.keys(req.request.body as object)).not.toContain('tenantId');

    req.flush({
      success: true,
      data: buildRestaurant(),
      errorCode: null,
      message: null,
      errors: null,
      traceId: null
    } as ApiResponse<RestaurantDto>);
  });
});
