
import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController
} from '@angular/common/http/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { MenuManagement } from './menu-management';
import { AuthorizationService } from '../../../../core/services/authorization.service';
import { TenantContextService } from '../../../../core/services/tenant-context.service';
import { environment } from '../../../../../environments/environment';
import type { ApiResponse } from '../../../../core/models/api-response.model';
import type { MenuDetailsDto } from '../../models/menu.model';
import type { MenuItemSummaryDto } from '../../models/menu-item.model';
import type { MenuCategoryDto } from '../../models/menu-category.model';

const API_ROOT = `${environment.apiUrl.replace(/\/+$/, '')}/menus`;

const menu: MenuDetailsDto = {
  id: 'menu-1',
  tenantId: 'tenant-1',
  restaurantId: 'restaurant-1',
  name: 'Demo Menu',
  description: null,
  isActive: true,
  status: 'Draft',
  createdAt: '2026-01-01',
  updatedAt: null,
  categories: []
};

function flushGet(
  httpMock: HttpTestingController,
  url: string,
  data: unknown
): void {
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
            snapshot: {
              paramMap: {
                get: (key: string) => key === 'menuId' ? 'menu-1' : null
              }
            }
          }
        },
        {
          provide: AuthorizationService,
          useValue: {
            hasPermission: () => true
          }
        },
        {
          provide: TenantContextService,
          useValue: {
            activeTenantId: () => 'tenant-1'
          }
        },
        {
          provide: Router,
          useValue: {
            navigate: () => Promise.resolve(true)
          }
        }
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

    const menuRequest = httpMock.expectOne({
      method: 'GET',
      url: `${API_ROOT}/menu-1`
    });

    const summaryRequest = httpMock.expectOne({
      method: 'GET',
      url: `${API_ROOT}/menu-1/items/summary`
    });

    const categoriesRequest = httpMock.expectOne({
      method: 'GET',
      url: `${API_ROOT}/menu-1/categories`
    });

    const itemsRequest = httpMock.expectOne({
      method: 'GET',
      url: `${API_ROOT}/menu-1/items?page=1&pageSize=20&sortBy=name&sortDirection=asc`
    });

    menuRequest.flush({
      success: true,
      data: menu,
      message: null,
      errorCode: null,
      errors: null,
      traceId: null
    } as ApiResponse<MenuDetailsDto>);

    summaryRequest.flush({
      success: true,
      data: {
        totalItems: 100,
        availableItems: 60,
        unavailableItems: 40,
        categoryCount: 10
      } as MenuItemSummaryDto,
      message: null,
      errorCode: null,
      errors: null,
      traceId: null
    } as ApiResponse<MenuItemSummaryDto>);

    categoriesRequest.flush({
      success: true,
      data: [] as MenuCategoryDto[],
      message: null,
      errorCode: null,
      errors: null,
      traceId: null
    } as ApiResponse<MenuCategoryDto[]>);

    itemsRequest.flush({
      success: true,
      data: {
        items: [],
        totalCount: 0,
        page: 1,
        pageSize: 20,
        totalPages: 0
      },
      message: null,
      errorCode: null,
      errors: null,
      traceId: null
    } as ApiResponse<unknown>);

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Demo Menu');

    const summaryElements = Array.from(
      fixture.nativeElement.querySelectorAll('.summary-card__value')
    ) as HTMLElement[];

    const summaryValues = summaryElements.map(
      element => element.textContent?.trim() ?? ''
    );

    expect(summaryValues).toEqual(['100', '60', '40', '10']);
  });
});
