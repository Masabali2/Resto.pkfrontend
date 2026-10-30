import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController
} from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { MenuList } from './menu-list';
import { RestaurantService } from '../../../../core/services/restaurant.service';
import { MenuService } from '../../services/menu.service';
import { AuthorizationService } from '../../../../core/services/authorization.service';
import { TenantContextService } from '../../../../core/services/tenant-context.service';
import { environment } from '../../../../../environments/environment';
import type { ApiResponse } from '../../../../core/models/api-response.model';
import type { MenuDto } from '../../models/menu.model';
import type { RestaurantDto } from '../../../websites/models/restaurant.model';

const RESTAURANTS_URL = `${environment.apiUrl}/restaurants?page=1&pageSize=100`;

const restaurant: RestaurantDto = {
  id: 'restaurant-1',
  tenantId: 'tenant-1',
  name: 'R1',
  description: null,
  phone: null,
  email: null,
  addressLine1: '1 Main St',
  addressLine2: null,
  city: 'Karachi',
  country: 'PK',
  timeZone: 'Asia/Karachi',
  status: 'Active',
  createdAt: '2026-01-01',
  updatedAt: null
};

function menu(id: string): MenuDto {
  return {
    id,
    tenantId: 'tenant-1',
    restaurantId: 'restaurant-1',
    name: `Menu ${id}`,
    description: null,
    isActive: true,
    status: 'Draft',
    createdAt: '2026-01-01',
    updatedAt: null
  };
}

function apiResponse<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
    message: null,
    errorCode: null,
    errors: null,
    traceId: null
  } as ApiResponse<T>;
}

interface Fixture {
  component: MenuList;
  httpMock: HttpTestingController;
  navigateCalls: any[];
  canManage: boolean;
}

let component: MenuList;
let httpMock: HttpTestingController;
let navigateCalls: any[];
let canManage = true;

function flushRestaurants(): void {
  httpMock
    .expectOne({ method: 'GET', url: RESTAURANTS_URL })
    .flush(
      apiResponse({
        items: [restaurant],
        totalCount: 1,
        page: 1,
        pageSize: 100,
        totalPages: 1
      })
    );
}

function menusUrl(): string {
  return `${environment.apiUrl}/v1/restaurants/restaurant-1/menus?page=1&pageSize=20`;
}

function init(): Fixture {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [MenuList, HttpClientTestingModule],
    providers: [
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: {
            queryParamMap: convertToParamMap({ restaurantId: 'restaurant-1' })
          },
          queryParamMap: of(convertToParamMap({ restaurantId: 'restaurant-1' }))
        }
      },
      {
        provide: Router,
        useValue: {
          navigate: (...args: any[]) => {
            navigateCalls.push(args);
            return Promise.resolve(true);
          }
        }
      },
      {
        provide: AuthorizationService,
        useValue: { hasPermission: () => canManage }
      },
      {
        provide: TenantContextService,
        useValue: { activeTenantId: signal('tenant-1') } as any
      }
    ]
  });

  component = TestBed.createComponent(MenuList).componentInstance;
  httpMock = TestBed.inject(HttpTestingController);
  navigateCalls = [];
  return { component, httpMock, navigateCalls, canManage };
}

describe('MenuList default menu auto-open', () => {
  afterEach(() => {
    httpMock.verify();
  });

  it('opens the single menu automatically on /menus/:id/manage', async () => {
    canManage = true;
    init();
    await new Promise(resolve => setTimeout(resolve, 0));

    flushRestaurants();

    httpMock
      .expectOne({ method: 'GET', url: menusUrl() })
      .flush(
        apiResponse({
          items: [menu('menu-1')],
          totalCount: 1,
          page: 1,
          pageSize: 20,
          totalPages: 1
        })
      );

    const c = component as any;

    expect(c.pageState()).toBe('list');
    expect(c.menus().length).toBe(1);
    expect(navigateCalls).toEqual([
      [
        ['/menus', 'menu-1', 'manage'],
        {
          queryParams: { restaurantId: 'restaurant-1' },
          queryParamsHandling: 'merge',
          replaceUrl: true
        }
      ]
    ]);
  });

  it('stays on the list when multiple menus exist (no default flag)', async () => {
    canManage = true;
    init();
    await new Promise(resolve => setTimeout(resolve, 0));

    flushRestaurants();

    httpMock
      .expectOne({ method: 'GET', url: menusUrl() })
      .flush(
        apiResponse({
          items: [menu('menu-1'), menu('menu-2')],
          totalCount: 2,
          page: 1,
          pageSize: 20,
          totalPages: 1
        })
      );

    const c = component as any;

    expect(c.pageState()).toBe('list');
    expect(c.menus().length).toBe(2);
    expect(navigateCalls.length).toBe(0);
  });

  it('shows empty state and does not navigate when no menus exist', async () => {
    canManage = true;
    init();
    await new Promise(resolve => setTimeout(resolve, 0));

    flushRestaurants();

    httpMock
      .expectOne({ method: 'GET', url: menusUrl() })
      .flush(
        apiResponse({
          items: [],
          totalCount: 0,
          page: 1,
          pageSize: 20,
          totalPages: 0
        })
      );

    const c = component as any;

    expect(c.pageState()).toBe('empty');
    expect(c.menus().length).toBe(0);
    expect(navigateCalls.length).toBe(0);
  });

  it('does not navigate when the user cannot manage menus', async () => {
    canManage = false;
    init();
    await new Promise(resolve => setTimeout(resolve, 0));

    flushRestaurants();

    httpMock
      .expectOne({ method: 'GET', url: menusUrl() })
      .flush(
        apiResponse({
          items: [menu('menu-1')],
          totalCount: 1,
          page: 1,
          pageSize: 20,
          totalPages: 1
        })
      );

    const c = component as any;

    expect(c.pageState()).toBe('list');
    expect(c.menus().length).toBe(1);
    expect(navigateCalls.length).toBe(0);
  });
});
