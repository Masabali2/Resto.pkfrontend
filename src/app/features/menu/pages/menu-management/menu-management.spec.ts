import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController
} from '@angular/common/http/testing';
import { MenuManagement } from './menu-management';
import { MenuService } from '../../services/menu.service';
import { AuthorizationService } from '../../../../core/services/authorization.service';
import { TenantContextService } from '../../../../core/services/tenant-context.service';
import { ActivatedRoute } from '@angular/router';
import type { ApiResponse } from '../../../../core/models/api-response.model';
import type { MenuDetailsDto } from '../../models/menu.model';
import type { MenuItemSummaryDto } from '../../models/menu-item.model';
import type { MenuCategoryDto } from '../../models/menu-category.model';
import type { MenuItemDto } from '../../models/menu-item.model';

const API_ROOT = 'https://localhost:7182/api/v1';

const menu: MenuDetailsDto = {
  id: 'menu-1',
  tenantId: 'tenant-1',
  restaurantId: 'restaurant-1',
  name: 'Demo Menu',
  description: null,
  isActive: true,
  status: 'Active',
  createdAt: '2026-01-01',
  updatedAt: null,
  categories: []
};

function flushGet(httpMock: HttpTestingController, url: string, data: unknown): void {
  httpMock.expectOne({ method: 'GET', url }).flush({
    success: true,
    data,
    message: null,
    errorCode: null,
    errors: null,
    traceId: null
  } as ApiResponse<unknown>);
}

describe('MenuManagement', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MenuManagement, HttpClientTestingModule],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: { get: (key: string) => (key === 'menuId' ? 'menu-1' : null) } }
          }
        },
        { provide: AuthorizationService, useValue: { hasPermission: () => true } },
        { provide: TenantContextService, useValue: { activeTenantId: () => 'tenant-1' } }
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('loads menu, summary, categories and items, then renders the list', () => {
    const fixture = TestBed.createComponent(MenuManagement);
    fixture.detectChanges();

    expect(fixture.componentInstance.pageState()).toBe('loading');

    flushGet(httpMock, `${API_ROOT}/menus/menu-1`, menu);
    flushGet(httpMock, `${API_ROOT}/menus/menu-1/items/summary`, {
      totalItems: 100,
      availableItems: 60,
      unavailableItems: 40,
      categoryCount: 10
    } as MenuItemSummaryDto);
    flushGet(httpMock, `${API_ROOT}/menus/menu-1/categories`, [] as MenuCategoryDto[]);
    flushGet(httpMock, `${API_ROOT}/menus/menu-1/items?page=1&pageSize=20&sortBy=name&sortDirection=asc`, {
      items: [],
      totalCount: 0,
      page: 1,
      pageSize: 20,
      totalPages: 0
    });

    fixture.detectChanges();

    expect(fixture.componentInstance.pageState()).toBe('empty');
    expect(fixture.componentInstance.summary()?.totalItems).toBe(100);
    expect(fixture.componentInstance.menu()?.name).toBe('Demo Menu');
  });
});
