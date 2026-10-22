import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';
import { DashboardService } from './dashboard.service';
import type { ApiResponse } from '../../../core/models/api-response.model';
import type { DashboardSnapshot } from '../models/dashboard-snapshot.model';
import type { RestaurantDto } from '../../websites/models/restaurant.model';
import type { WebsiteDto } from '../../websites/models/website.model';

const API_ROOT = 'https://localhost:7182/api';

const restaurant: RestaurantDto = {
  id: 'restaurant-1',
  tenantId: 'tenant-1',
  name: 'Brewed & Co.',
  description: null,
  phone: null,
  email: null,
  addressLine1: '1 Main Street',
  addressLine2: null,
  city: 'Lahore',
  country: 'Pakistan',
  timeZone: 'Asia/Karachi',
  status: 'Active',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: null
};

const website = {
  id: 'website-1',
  tenantId: 'tenant-1',
  restaurantId: 'restaurant-1',
  restaurantName: 'Brewed & Co.',
  websiteTemplateId: 'template-1',
  templateName: 'Classic',
  templateKey: 'classic',
  name: 'Brewed & Co.',
  slug: 'brewed-and-co',
  status: 'Draft',
  isPublished: false,
  publishedAt: null,
  draftVersion: 1,
  publishedVersion: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: null
} as WebsiteDto;

function apiResponse<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
    errorCode: null,
    message: null,
    errors: null,
    traceId: null
  };
}

function paged<T>(items: T[], totalCount: number) {
  return {
    items,
    totalCount,
    page: 1,
    pageSize: 20,
    totalPages: 1
  };
}

describe('DashboardService', () => {
  let service: DashboardService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });

    service = TestBed.inject(DashboardService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('reads restaurants, websites and menus for the active tenant', () => {
    let snapshot: DashboardSnapshot | undefined;

    service.loadSnapshot().subscribe(result => (snapshot = result));

    httpMock
      .expectOne(req => req.url === `${API_ROOT}/restaurants`)
      .flush(apiResponse(paged([restaurant], 1)));

    httpMock
      .expectOne(req => req.url === `${API_ROOT}/v1/websites`)
      .flush(apiResponse(paged([website], 1)));

    httpMock
      .expectOne(
        req => req.url === `${API_ROOT}/v1/restaurants/restaurant-1/menus`
      )
      .flush(apiResponse(paged([], 0)));

    expect(snapshot?.restaurants.status).toBe('ready');
    expect(snapshot?.restaurants.totalCount).toBe(1);
    expect(snapshot?.websites.status).toBe('ready');
    expect(snapshot?.websites.totalCount).toBe(1);
    expect(snapshot?.menus.status).toBe('ready');
    expect(snapshot?.menus.totalCount).toBe(0);
  });

  it('degrades a failing source instead of breaking the whole snapshot', () => {
    let snapshot: DashboardSnapshot | undefined;

    service.loadSnapshot().subscribe(result => (snapshot = result));

    httpMock
      .expectOne(req => req.url === `${API_ROOT}/restaurants`)
      .flush('boom', { status: 500, statusText: 'Server Error' });

    httpMock
      .expectOne(req => req.url === `${API_ROOT}/v1/websites`)
      .flush(apiResponse(paged([website], 1)));

    expect(snapshot?.restaurants.status).toBe('unavailable');
    expect(snapshot?.websites.status).toBe('ready');
    expect(snapshot?.menus.status).toBe('unavailable');
  });

  it('keeps menus unavailable while the workspace has no restaurant', () => {
    let snapshot: DashboardSnapshot | undefined;

    service.loadSnapshot().subscribe(result => (snapshot = result));

    httpMock
      .expectOne(req => req.url === `${API_ROOT}/restaurants`)
      .flush(apiResponse(paged([], 0)));

    httpMock
      .expectOne(req => req.url === `${API_ROOT}/v1/websites`)
      .flush(apiResponse(paged([], 0)));

    expect(snapshot?.restaurants.totalCount).toBe(0);
    expect(snapshot?.menus.status).toBe('unavailable');
    expect(
      httpMock.match(req => req.url.includes('/menus')).length
    ).toBe(0);
  });
});
