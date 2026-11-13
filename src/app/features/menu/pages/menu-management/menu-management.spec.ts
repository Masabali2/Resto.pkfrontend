import { signal, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController
} from '@angular/common/http/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { vi } from 'vitest';
import { MenuManagement } from './menu-management';
import { AuthorizationService } from '../../../../core/services/authorization.service';
import { TenantContextService } from '../../../../core/services/tenant-context.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { environment } from '../../../../../environments/environment';
import type { ApiResponse } from '../../../../core/models/api-response.model';
import type { MenuDetailsDto } from '../../models/menu.model';
import type { MenuItemDto, MenuItemSummaryDto } from '../../models/menu-item.model';
import type { MenuCategoryDto } from '../../models/menu-category.model';

const API_ROOT = `${environment.apiUrl.replace(/\/+$/, '')}/v1/menus`;
const CATEGORY_API_ROOT = `${environment.apiUrl.replace(/\/+$/, '')}/v1/menu-categories`;

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

const categories: MenuCategoryDto[] = [
  {
    id: 'cat-1',
    menuId: 'menu-1',
    name: 'Burgers',
    description: 'Beef, chicken and veggie burgers.',
    displayOrder: 1,
    isActive: true,
    createdAt: '2026-01-01',
    updatedAt: null,
    itemCount: 2
  },
  {
    id: 'cat-2',
    menuId: 'menu-1',
    name: 'Drinks',
    description: null,
    displayOrder: 2,
    isActive: true,
    createdAt: '2026-01-01',
    updatedAt: null,
    itemCount: 0
  }
];

const summary: MenuItemSummaryDto = {
  totalItems: 100,
  availableItems: 60,
  unavailableItems: 40,
  categoryCount: 2
};

const emptyItemsPage = {
  items: [],
  totalCount: 0,
  page: 1,
  pageSize: 20,
  totalPages: 0
};

const burgerItem: MenuItemDto = {
  id: 'item-1',
  menuCategoryId: 'cat-1',
  menuId: 'menu-1',
  name: 'Classic Burger',
  description: null,
  price: 12.5,
  currency: 'PKR',
  imageFileId: null,
  displayOrder: 1,
  isAvailable: true,
  isActive: true,
  createdAt: '2026-01-01',
  updatedAt: null,
  categoryName: 'Burgers',
  imageUrl: null
};

const drinkItem: MenuItemDto = {
  id: 'item-2',
  menuCategoryId: 'cat-2',
  menuId: 'menu-1',
  name: 'Cola',
  description: null,
  price: 2.5,
  currency: 'PKR',
  imageFileId: null,
  displayOrder: 1,
  isAvailable: true,
  isActive: true,
  createdAt: '2026-01-01',
  updatedAt: null,
  categoryName: 'Drinks',
  imageUrl: null
};

function ok<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
    message: null,
    errorCode: null,
    errors: null,
    traceId: null
  } as ApiResponse<T>;
}

function flushGet(
  httpMock: HttpTestingController,
  url: string,
  data: unknown
): void {
  httpMock.expectOne({ method: 'GET', url }).flush(ok(data));
}

describe('MenuManagement', () => {
  let httpMock: HttpTestingController;
  let notification: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
  let activeTenantId: WritableSignal<string | null>;

  beforeEach(() => {
    notification = { success: vi.fn(), error: vi.fn() };
    activeTenantId = signal<string | null>('tenant-1');

    TestBed.configureTestingModule({
      imports: [MenuManagement, HttpClientTestingModule],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => key === 'menuId' ? 'menu-1' : null
              },
              queryParamMap: {
                get: () => null
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
            activeTenantId
          }
        },
        {
          provide: NotificationService,
          useValue: notification
        },
        {
          provide: Router,
          useValue: {
            navigate: vi.fn(() => Promise.resolve(true))
          }
        }
      ]
    });

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  function loadPage(fixture: ReturnType<typeof TestBed.createComponent<MenuManagement>>): void {
    fixture.detectChanges();

    flushGet(httpMock, `${API_ROOT}/menu-1`, menu);
    flushGet(httpMock, `${API_ROOT}/menu-1/items/summary`, summary);
    flushGet(httpMock, `${API_ROOT}/menu-1/categories`, categories);
    flushGet(
      httpMock,
      `${API_ROOT}/menu-1/items?page=1&pageSize=20&sortBy=name&sortDirection=asc`,
      emptyItemsPage
    );

    fixture.detectChanges();
  }

  it('loads menu, summary, categories and items, then renders the list', () => {
    const fixture = TestBed.createComponent(MenuManagement);

    loadPage(fixture);

    expect(fixture.nativeElement.textContent).toContain('Demo Menu');

    const summaryElements = Array.from(
      fixture.nativeElement.querySelectorAll('.summary-card__value')
    ) as HTMLElement[];

    const summaryValues = summaryElements.map(
      element => element.textContent?.trim() ?? ''
    );

    expect(summaryValues).toEqual(['100', '60', '40', '2']);
  });

  it('navigates to the new category form with a manage return target', () => {
    const fixture = TestBed.createComponent(MenuManagement);
    loadPage(fixture);

    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const addCategory = fixture.nativeElement.querySelector(
      '.btn-new-category'
    ) as HTMLButtonElement;
    expect(addCategory).not.toBeNull();
    addCategory.click();

    expect(navigate).toHaveBeenCalledWith(
      ['/menus', 'menu-1', 'categories', 'new'],
      {
        queryParams: {
          returnTo: 'manage',
          restaurantId: 'restaurant-1'
        }
      }
    );
  });

  it('toggles a category and falls back when the selected category becomes inactive', () => {
    const fixture = TestBed.createComponent(MenuManagement);
    loadPage(fixture);

    const filterBurgers = fixture.nativeElement.querySelector(
      '[aria-label="Filter menu items by Burgers"]'
    ) as HTMLButtonElement;
    filterBurgers.click();
    flushGet(
      httpMock,
      `${API_ROOT}/menu-1/items?page=1&pageSize=20&categoryId=cat-1&sortBy=name&sortDirection=asc`,
      emptyItemsPage
    );
    fixture.detectChanges();

    const toggle = fixture.nativeElement.querySelector(
      '[aria-label="Deactivate Burgers"]'
    ) as HTMLButtonElement;
    expect(toggle).not.toBeNull();
    toggle.click();

    const request = httpMock.expectOne({
      method: 'PATCH',
      url: `${CATEGORY_API_ROOT}/cat-1/status`
    });
    expect(request.request.body).toEqual({ isActive: false });
    request.flush(ok({ ...categories[0], isActive: false }));

    flushGet(
      httpMock,
      `${API_ROOT}/menu-1/items?page=1&pageSize=20&categoryId=cat-2&sortBy=name&sortDirection=asc`,
      emptyItemsPage
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Inactive');
    const filterDrinks = fixture.nativeElement.querySelector(
      '[aria-label="Filter menu items by Drinks"]'
    ) as HTMLButtonElement;
    expect(filterDrinks.getAttribute('aria-pressed')).toBe('true');
    expect(notification.success).toHaveBeenCalled();
  });

  it('keeps the previous category status when a toggle fails', () => {
    const fixture = TestBed.createComponent(MenuManagement);
    loadPage(fixture);

    const toggle = fixture.nativeElement.querySelector(
      '[aria-label="Deactivate Burgers"]'
    ) as HTMLButtonElement;
    toggle.click();

    httpMock
      .expectOne({
        method: 'PATCH',
        url: `${CATEGORY_API_ROOT}/cat-1/status`
      })
      .flush(
        { message: 'Status update failed.' },
        { status: 500, statusText: 'Server Error' }
      );
    fixture.detectChanges();

    const burgerRow = Array.from(
      fixture.nativeElement.querySelectorAll('.category-row') as NodeListOf<HTMLElement>
    ).find(row => row.textContent?.includes('Burgers')) as HTMLElement | undefined;
    expect(burgerRow?.textContent).toContain('Active');
    expect(fixture.nativeElement.textContent).toContain('Status update failed.');
    expect(notification.error).toHaveBeenCalled();
  });

  it('reorders categories and persists the complete ordered id list', () => {
    const fixture = TestBed.createComponent(MenuManagement);
    loadPage(fixture);

    const moveDown = fixture.nativeElement.querySelector(
      '[aria-label="Move Burgers down"]'
    ) as HTMLButtonElement;
    expect(moveDown).not.toBeNull();
    moveDown.click();

    const request = httpMock.expectOne({
      method: 'PATCH',
      url: `${API_ROOT}/menu-1/categories/order`
    });
    expect(request.request.body).toEqual({
      orderedCategoryIds: ['cat-2', 'cat-1']
    });
    request.flush(ok([
      { ...categories[1], displayOrder: 1 },
      { ...categories[0], displayOrder: 2 }
    ]));
    fixture.detectChanges();

    const names = (Array.from(
      fixture.nativeElement.querySelectorAll('.category-row__name')
    ) as HTMLElement[]).map(element => element.textContent?.trim() ?? '');

    expect(names).toEqual(['Drinks', 'Burgers']);
  });

  it('restores the original category order when reordering fails', () => {
    const fixture = TestBed.createComponent(MenuManagement);
    loadPage(fixture);

    const moveDown = fixture.nativeElement.querySelector(
      '[aria-label="Move Burgers down"]'
    ) as HTMLButtonElement;
    moveDown.click();

    httpMock
      .expectOne({
        method: 'PATCH',
        url: `${API_ROOT}/menu-1/categories/order`
      })
      .flush(
        { message: 'Could not save order.' },
        { status: 500, statusText: 'Server Error' }
      );
    fixture.detectChanges();

    const names = (Array.from(
      fixture.nativeElement.querySelectorAll('.category-row__name')
    ) as HTMLElement[]).map(element => element.textContent?.trim() ?? '');

    expect(names).toEqual(['Burgers', 'Drinks']);
    expect(fixture.nativeElement.textContent).toContain('Could not save order.');
    expect(notification.error).toHaveBeenCalled();
  });

  it('ignores a stale reorder response after the active tenant changes', () => {
    const fixture = TestBed.createComponent(MenuManagement);
    loadPage(fixture);

    const moveDown = fixture.nativeElement.querySelector(
      '[aria-label="Move Burgers down"]'
    ) as HTMLButtonElement;
    moveDown.click();

    const staleReorder = httpMock.expectOne({
      method: 'PATCH',
      url: `${API_ROOT}/menu-1/categories/order`
    });

    activeTenantId.set('tenant-2');
    fixture.detectChanges();

    flushGet(httpMock, `${API_ROOT}/menu-1`, menu);
    flushGet(httpMock, `${API_ROOT}/menu-1/items/summary`, summary);
    flushGet(httpMock, `${API_ROOT}/menu-1/categories`, [
      {
        ...categories[0],
        id: 'cat-9',
        name: 'Pizza',
        itemCount: 0
      }
    ]);
    flushGet(
      httpMock,
      `${API_ROOT}/menu-1/items?page=1&pageSize=20&sortBy=name&sortDirection=asc`,
      emptyItemsPage
    );
    fixture.detectChanges();

    staleReorder.flush(ok([...categories].reverse()));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Pizza');
    expect(fixture.nativeElement.textContent).not.toContain('Burgers');
    expect(notification.success).not.toHaveBeenCalledWith(
      'Category order updated.'
    );
  });

  it('deletes an empty category and selects a valid fallback category', () => {
    const fixture = TestBed.createComponent(MenuManagement);
    loadPage(fixture);

    const filterBurgers = fixture.nativeElement.querySelector(
      '[aria-label="Filter menu items by Burgers"]'
    ) as HTMLButtonElement;
    filterBurgers.click();
    flushGet(
      httpMock,
      `${API_ROOT}/menu-1/items?page=1&pageSize=20&categoryId=cat-1&sortBy=name&sortDirection=asc`,
      emptyItemsPage
    );
    fixture.detectChanges();

    const deleteButton = fixture.nativeElement.querySelector(
      '[aria-label="Delete Burgers"]'
    ) as HTMLButtonElement;
    deleteButton.click();
    fixture.detectChanges();

    const confirm = fixture.nativeElement.querySelector(
      '.confirmation-overlay .btn-danger'
    ) as HTMLButtonElement;
    confirm.click();

    httpMock
      .expectOne({
        method: 'DELETE',
        url: `${CATEGORY_API_ROOT}/cat-1`
      })
      .flush(null);

    flushGet(
      httpMock,
      `${API_ROOT}/menu-1/items?page=1&pageSize=20&categoryId=cat-2&sortBy=name&sortDirection=asc`,
      emptyItemsPage
    );
    flushGet(httpMock, `${API_ROOT}/menu-1/items/summary`, summary);
    fixture.detectChanges();

    const names = (Array.from(
      fixture.nativeElement.querySelectorAll('.category-row__name')
    ) as HTMLElement[]).map(element => element.textContent?.trim() ?? '');

    expect(names).toEqual(['Drinks']);
    const filterDrinks = fixture.nativeElement.querySelector(
      '[aria-label="Filter menu items by Drinks"]'
    ) as HTMLButtonElement;
    expect(filterDrinks.getAttribute('aria-pressed')).toBe('true');
    expect(notification.success).toHaveBeenCalled();
  });

  it('ignores a stale item response after the user switches categories', () => {
    const fixture = TestBed.createComponent(MenuManagement);
    loadPage(fixture);

    (fixture.nativeElement.querySelector(
      '[aria-label="Filter menu items by Burgers"]'
    ) as HTMLButtonElement).click();
    (fixture.nativeElement.querySelector(
      '[aria-label="Filter menu items by Drinks"]'
    ) as HTMLButtonElement).click();

    const burgerRequest = httpMock.expectOne({
      method: 'GET',
      url: `${API_ROOT}/menu-1/items?page=1&pageSize=20&categoryId=cat-1&sortBy=name&sortDirection=asc`
    });
    const drinkRequest = httpMock.expectOne({
      method: 'GET',
      url: `${API_ROOT}/menu-1/items?page=1&pageSize=20&categoryId=cat-2&sortBy=name&sortDirection=asc`
    });

    drinkRequest.flush(ok({
      items: [drinkItem],
      totalCount: 1,
      page: 1,
      pageSize: 20,
      totalPages: 1
    }));
    fixture.detectChanges();

    burgerRequest.flush(ok({
      items: [burgerItem],
      totalCount: 1,
      page: 1,
      pageSize: 20,
      totalPages: 1
    }));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Cola');
    expect(fixture.nativeElement.textContent).not.toContain('Classic Burger');
  });

  it('keeps the category and surfaces the backend message on delete conflict', () => {
    const fixture = TestBed.createComponent(MenuManagement);
    loadPage(fixture);

    const deleteButton = fixture.nativeElement.querySelector(
      '[aria-label="Delete Burgers"]'
    ) as HTMLButtonElement;
    expect(deleteButton).not.toBeNull();
    deleteButton.click();
    fixture.detectChanges();

    const confirm = fixture.nativeElement.querySelector(
      '.confirmation-overlay .btn-danger'
    ) as HTMLButtonElement;
    expect(confirm).not.toBeNull();
    confirm.click();

    const request = httpMock.expectOne({
      method: 'DELETE',
      url: `${CATEGORY_API_ROOT}/cat-1`
    });
    request.flush(
      { message: 'This category still contains menu items.' },
      { status: 409, statusText: 'Conflict' }
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'This category still contains menu items.'
    );

    const names = (Array.from(
      fixture.nativeElement.querySelectorAll('.category-row__name')
    ) as HTMLElement[]).map(element => element.textContent?.trim() ?? '');

    expect(names).toContain('Burgers');
    expect(notification.error).toHaveBeenCalled();
  });

  it('publishes a Draft menu and updates the local status from the backend response', () => {
    const fixture = TestBed.createComponent(MenuManagement);
    loadPage(fixture);

    const component = fixture.componentInstance as unknown as {
      menu: WritableSignal<MenuDetailsDto | null>;
      publishedUrl: WritableSignal<string | null>;
    };
    const publish = fixture.nativeElement.querySelector(
      '[aria-label="Publish Changes"]'
    ) as HTMLButtonElement;
    expect(publish).not.toBeNull();
    expect(publish.disabled).toBe(false);

    publish.click();

    const request = httpMock.expectOne({
      method: 'PATCH',
      url: `${API_ROOT}/menu-1/publish`
    });
    expect(request.request.body).toBeNull();
    request.flush(
      ok({ ...menu, status: 'Published', publicUrl: 'https://localhost:4200/r/pub-site/menu' })
    );
    flushGet(httpMock, `${API_ROOT}/menu-1/items/summary`, summary);
    fixture.detectChanges();

    expect(component.menu()?.status).toBe('Published');
    expect(component.menu()?.isActive).toBe(true);
    expect(component.publishedUrl()).toBe('https://localhost:4200/r/pub-site/menu');

    const urlInput = fixture.nativeElement.querySelector(
      'input[aria-label="Public menu URL"]'
    ) as HTMLInputElement | null;
    expect(urlInput).not.toBeNull();
    expect(urlInput!.value).toBe('https://localhost:4200/r/pub-site/menu');
    expect(urlInput!.readOnly).toBe(true);

    expect(notification.success).toHaveBeenCalledWith(
      'Menu published successfully to Resto.pk live QR & Web channels!'
    );
    expect(publish.disabled).toBe(false);
    expect(notification.error).not.toHaveBeenCalled();
  });

  it('unpublishes a Published menu back to Draft', () => {
    const fixture = TestBed.createComponent(MenuManagement);
    loadPage(fixture);

    const component = fixture.componentInstance as unknown as {
      menu: WritableSignal<MenuDetailsDto | null>;
      publishedUrl: WritableSignal<string | null>;
    };
    component.menu.set({ ...menu, status: 'Published', publicUrl: 'https://localhost:4200/r/pub-site/menu' });
    component.publishedUrl.set('https://localhost:4200/r/pub-site/menu');
    fixture.detectChanges();

    const unpublish = fixture.nativeElement.querySelector(
      '[aria-label="Unpublish"]'
    ) as HTMLButtonElement;
    expect(unpublish).not.toBeNull();

    unpublish.click();

    const request = httpMock.expectOne({
      method: 'PATCH',
      url: `${API_ROOT}/menu-1/unpublish`
    });
    request.flush(ok({ ...menu, status: 'Draft' }));
    flushGet(httpMock, `${API_ROOT}/menu-1/items/summary`, summary);
    fixture.detectChanges();

    expect(component.menu()?.status).toBe('Draft');
    expect(component.publishedUrl()).toBeNull();
    expect(notification.success).toHaveBeenCalledWith(
      'Menu unpublished successfully.'
    );
  });

  it('does not change local status when publish fails', () => {
    const fixture = TestBed.createComponent(MenuManagement);
    loadPage(fixture);

    const component = fixture.componentInstance as unknown as {
      menu: WritableSignal<MenuDetailsDto | null>;
    };
    const publish = fixture.nativeElement.querySelector(
      '[aria-label="Publish Changes"]'
    ) as HTMLButtonElement;
    publish.click();

    httpMock
      .expectOne({ method: 'PATCH', url: `${API_ROOT}/menu-1/publish` })
      .flush(
        { message: 'Menu cannot be published.' },
        { status: 400, statusText: 'Bad Request' }
      );
    fixture.detectChanges();

    expect(component.menu()?.status).toBe('Draft');
    expect(notification.error).toHaveBeenCalled();
  });

  it('blocks repeated publish clicks while a request is running', () => {
    const fixture = TestBed.createComponent(MenuManagement);
    loadPage(fixture);

    const publish = fixture.nativeElement.querySelector(
      '[aria-label="Publish Changes"]'
    ) as HTMLButtonElement;
    publish.click();
    fixture.detectChanges();

    const request = httpMock.expectOne({
      method: 'PATCH',
      url: `${API_ROOT}/menu-1/publish`
    });

    expect(publish.disabled).toBe(true);

    // A second click while the request is running must not fire again.
    publish.click();
    expect(() =>
      httpMock.expectOne({
        method: 'PATCH',
        url: `${API_ROOT}/menu-1/publish`
      })
    ).toThrow();

    request.flush(ok({ ...menu, status: 'Published' }));
    flushGet(httpMock, `${API_ROOT}/menu-1/items/summary`, summary);
    fixture.detectChanges();

    expect(publish.disabled).toBe(false);
  });

  it('resets loading state after a failed publish', () => {
    const fixture = TestBed.createComponent(MenuManagement);
    loadPage(fixture);

    const component = fixture.componentInstance as unknown as {
      menu: WritableSignal<MenuDetailsDto | null>;
    };
    const publish = fixture.nativeElement.querySelector(
      '[aria-label="Publish Changes"]'
    ) as HTMLButtonElement;
    publish.click();

    httpMock
      .expectOne({ method: 'PATCH', url: `${API_ROOT}/menu-1/publish` })
      .flush(null, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(publish.disabled).toBe(false);
    expect(component.menu()?.status).toBe('Draft');
  });

  it('shows the backend validation message on publish failure', () => {
    const fixture = TestBed.createComponent(MenuManagement);
    loadPage(fixture);

    const publish = fixture.nativeElement.querySelector(
      '[aria-label="Publish Changes"]'
    ) as HTMLButtonElement;
    publish.click();

    httpMock
      .expectOne({ method: 'PATCH', url: `${API_ROOT}/menu-1/publish` })
      .flush(
        { message: 'A menu requires at least one active category to publish.' },
        { status: 400, statusText: 'Bad Request' }
      );
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'A menu requires at least one active category to publish.'
    );
    expect(notification.error).toHaveBeenCalled();
  });

  it('prevents publishing an Archived menu', () => {
    const fixture = TestBed.createComponent(MenuManagement);
    loadPage(fixture);

    const component = fixture.componentInstance as unknown as {
      menu: WritableSignal<MenuDetailsDto | null>;
    };
    component.menu.set({ ...menu, status: 'Archived', isActive: false });
    fixture.detectChanges();

    const publish = fixture.nativeElement.querySelector(
      '[aria-label="Publish Changes"]'
    ) as HTMLButtonElement;
    expect(publish.disabled).toBe(true);
  });
});

