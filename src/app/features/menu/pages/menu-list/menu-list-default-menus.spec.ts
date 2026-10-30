import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController
} from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { MenuList } from './menu-list';
import { AuthorizationService } from '../../../../core/services/authorization.service';
import { TenantContextService } from '../../../../core/services/tenant-context.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { environment } from '../../../../../environments/environment';
import type { ApiResponse } from '../../../../core/models/api-response.model';
import type {
  DefaultMenuDetailsDto,
  MenuDto
} from '../../models/menu.model';
import type { MenuItemDto } from '../../models/menu-item.model';
import type { RestaurantDto } from '../../../websites/models/restaurant.model';

const RESTAURANTS_URL = `${environment.apiUrl}/restaurants?page=1&pageSize=100`;
const MENUS_URL = `${environment.apiUrl}/v1/restaurants/restaurant-1/menus?page=1&pageSize=20`;
const DEFAULT_MENU_URL = `${environment.apiUrl}/v1/menus/default`;
const COPY_DEFAULT_URL = `${environment.apiUrl}/v1/restaurants/restaurant-1/menus/copy-default`;

const restaurant: RestaurantDto = {
  id: 'restaurant-1',
  tenantId: 'tenant-1',
  name: 'Acme Downtown',
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

function menu(id: string, name = `Menu ${id}`): MenuDto {
  return {
    id,
    tenantId: 'tenant-1',
    restaurantId: 'restaurant-1',
    name,
    description: null,
    isActive: true,
    status: 'Draft',
    createdAt: '2026-01-01',
    updatedAt: null
  };
}

function item(
  id: string,
  name: string,
  price: number,
  categoryId: string
): MenuItemDto {
  return {
    id,
    menuCategoryId: categoryId,
    menuId: 'demo-menu-1',
    name,
    description: `${name} description`,
    price,
    currency: 'PKR',
    imageFileId: null,
    displayOrder: 0,
    isAvailable: true,
    isActive: true,
    createdAt: '2026-01-01',
    updatedAt: null,
    categoryName: null,
    imageUrl: null
  };
}

function defaultMenu(): DefaultMenuDetailsDto {
  return {
    id: 'demo-menu-1',
    name: 'Demo Menu — 100 Dishes',
    description: 'A realistic demo menu used to exercise the catalogue.',
    status: 'Published',
    categoryCount: 2,
    itemCount: 3,
    categories: [
      {
        id: 'category-1',
        name: 'Starters & Snacks',
        description: null,
        displayOrder: 0,
        items: [
          item('item-1', 'Chicken Samosa', 120, 'category-1'),
          item('item-2', 'Loaded Fries', 550, 'category-1')
        ]
      },
      {
        id: 'category-2',
        name: 'Beverages',
        description: 'Chilled drinks.',
        displayOrder: 1,
        items: [item('item-3', 'Masala Chai', 120, 'category-2')]
      }
    ]
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

interface TestContext {
  fixture: ComponentFixture<MenuList>;
  component: MenuList;
  httpMock: HttpTestingController;
  navigateCalls: any[];
  notification: NotificationService;
}

function flushRestaurants(httpMock: HttpTestingController): void {
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

function flushMenus(
  httpMock: HttpTestingController,
  menus: MenuDto[]
): void {
  httpMock
    .expectOne({ method: 'GET', url: MENUS_URL })
    .flush(
      apiResponse({
        items: menus,
        totalCount: menus.length,
        page: 1,
        pageSize: 20,
        totalPages: menus.length > 0 ? 1 : 0
      })
    );
}

async function init(menus: MenuDto[] = [menu('menu-1'), menu('menu-2')]): Promise<TestContext> {
  TestBed.resetTestingModule();

  const navigateCalls: any[] = [];

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
        useValue: { hasPermission: () => true }
      },
      {
        provide: TenantContextService,
        useValue: { activeTenantId: signal('tenant-1') } as any
      }
    ]
  });

  const fixture = TestBed.createComponent(MenuList);
  const component = fixture.componentInstance;
  const httpMock = TestBed.inject(HttpTestingController);
  const notification = TestBed.inject(NotificationService);

  vi.spyOn(notification, 'success');

  fixture.detectChanges();
  await new Promise(resolve => setTimeout(resolve, 0));

  flushRestaurants(httpMock);
  flushMenus(httpMock, menus);
  fixture.detectChanges();

  return { fixture, component, httpMock, navigateCalls, notification };
}

function openDefaultSection(context: TestContext): void {
  const tab = context.fixture.nativeElement.querySelector(
    '.menu-list__tab'
  ) as HTMLButtonElement;

  tab.click();
  context.fixture.detectChanges();
}

function flushDefaultMenu(context: TestContext): void {
  context.httpMock
    .expectOne({ method: 'GET', url: DEFAULT_MENU_URL })
    .flush(apiResponse(defaultMenu()));

  context.fixture.detectChanges();
}

describe('MenuList default menus section', () => {
  let context: TestContext;

  afterEach(() => {
    context.httpMock.verify();
    vi.restoreAllMocks();
  });

  it('renders both menu sections without replacing the existing restaurant page', async () => {
    context = await init();

    const tabs = Array.from(
      context.fixture.nativeElement.querySelectorAll('.menu-list__tab')
    ) as HTMLButtonElement[];

    expect(tabs.map(tab => tab.textContent?.trim())).toEqual([
      'Default Menus',
      'Restaurant Menus'
    ]);
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
    expect(context.fixture.nativeElement.querySelector('.menu-list__table')).not.toBeNull();
  });

  it('loads the default menu from the backend and shows categories and dishes', async () => {
    context = await init();

    openDefaultSection(context);
    flushDefaultMenu(context);

    const element: HTMLElement = context.fixture.nativeElement;

    expect(element.querySelector('.menu-list__default-title')?.textContent)
      .toContain('Demo Menu — 100 Dishes');
    expect(element.querySelector('.menu-list__default-facts')?.textContent)
      .toContain('2');
    expect(element.querySelector('.menu-list__default-facts')?.textContent)
      .toContain('3');

    const catalogueButton = Array.from(
      element.querySelectorAll('.menu-list__default-actions app-button')
    ).find(button => button.textContent?.includes('View menu')) as HTMLElement;

    catalogueButton.click();
    context.fixture.detectChanges();

    expect(element.querySelectorAll('.menu-list__default-category')).toHaveLength(2);
    expect(element.querySelectorAll('.menu-list__default-item')).toHaveLength(3);
    expect(element.textContent).toContain('Chicken Samosa');
  });

  it('keeps restaurant menus and the selected restaurant intact', async () => {
    context = await init();

    const select = context.fixture.nativeElement.querySelector(
      '.menu-list__select'
    ) as HTMLSelectElement;

    expect(select.value).toBe('restaurant-1');
    expect(context.fixture.nativeElement.querySelectorAll('.menu-list__table tbody tr'))
      .toHaveLength(2);
  });

  it('copies the default menu and navigates to the new menu editor', async () => {
    context = await init();

    openDefaultSection(context);
    flushDefaultMenu(context);

    const defaultActionButtons = Array.from(
      context.fixture.nativeElement.querySelectorAll(
        '.menu-list__default-actions app-button'
      ) as NodeListOf<HTMLElement>
    );

    const useButton = defaultActionButtons.find(button =>
      button.textContent?.includes('Use This Menu')
    ) as HTMLElement;

    useButton.click();
    context.fixture.detectChanges();

    expect((context.component as any).copyDialogOpen()).toBe(true);

    (context.component as any).confirmCopyDefault();

    const request = context.httpMock.expectOne({
      method: 'POST',
      url: COPY_DEFAULT_URL
    });
    expect(request.request.body).toEqual({});
    expect((context.component as any).copyDialogOpen()).toBe(false);

    request.flush(apiResponse(menu('copied-menu-1', 'Demo Menu — 100 Dishes')));

    expect(context.notification.success).toHaveBeenCalled();
    expect(context.navigateCalls).toEqual([
      [
        ['/menus', 'copied-menu-1', 'manage'],
        {
          queryParams: { restaurantId: 'restaurant-1' },
          queryParamsHandling: 'merge'
        }
      ]
    ]);
    expect((context.component as any).copyingDefault()).toBe(false);
  });

  it('prevents duplicate copy requests while the first request is in flight', async () => {
    context = await init();

    openDefaultSection(context);
    flushDefaultMenu(context);

    (context.component as any).confirmCopyDefault();
    const request = context.httpMock.expectOne({
      method: 'POST',
      url: COPY_DEFAULT_URL
    });

    expect((context.component as any).copyingDefault()).toBe(true);

    (context.component as any).confirmCopyDefault();
    context.httpMock.expectNone({
      method: 'POST',
      url: COPY_DEFAULT_URL
    });

    request.flush(apiResponse(menu('copied-menu-2')));
  });

  it('shows backend errors through the existing error pattern', async () => {
    context = await init();

    openDefaultSection(context);
    flushDefaultMenu(context);

    (context.component as any).confirmCopyDefault();

    const request = context.httpMock.expectOne({
      method: 'POST',
      url: COPY_DEFAULT_URL
    });

    request.flush(
      {
        success: false,
        data: null,
        message: 'The default menu is not available.',
        errorCode: 'NOT_FOUND',
        errors: null,
        traceId: null
      },
      { status: 404, statusText: 'Not Found' }
    );

    context.fixture.detectChanges();

    const error = context.fixture.nativeElement.querySelector(
      '.menu-list__default-error'
    ) as HTMLElement;

    expect(error.textContent).toContain('The default menu is not available.');
    expect(context.navigateCalls).toEqual([]);
    expect((context.component as any).copyingDefault()).toBe(false);
  });

  it('keeps existing menu actions working', async () => {
    context = await init();

    (context.component as any).manageMenu(
      (context.component as any).menus()[0]
    );

    expect(context.navigateCalls).toEqual([
      [
        ['/menus', 'menu-1', 'manage'],
        {
          queryParams: { restaurantId: 'restaurant-1' },
          queryParamsHandling: 'merge'
        }
      ]
    ]);

    (context.component as any).openArchiveDialog(
      (context.component as any).menus()[0]
    );
    (context.component as any).confirmArchive();

    context.httpMock
      .expectOne({
        method: 'DELETE',
        url: `${environment.apiUrl}/v1/menus/menu-1`
      })
      .flush(null);

    expect((context.component as any).menus()).toHaveLength(1);
  });
});
