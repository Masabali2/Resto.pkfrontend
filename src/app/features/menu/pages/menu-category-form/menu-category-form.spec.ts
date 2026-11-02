import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController
} from '@angular/common/http/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { vi } from 'vitest';
import { MenuCategoryForm } from './menu-category-form';
import { NotificationService } from '../../../../core/services/notification.service';
import { environment } from '../../../../../environments/environment';
import type { ApiResponse } from '../../../../core/models/api-response.model';
import type { MenuCategoryDto } from '../../models/menu-category.model';
import type { MenuDetailsDto } from '../../models/menu.model';

const API_ROOT = `${environment.apiUrl.replace(/\/+$/, '')}/v1`;
const MENU_URL = `${API_ROOT}/menus/menu-1`;

const category: MenuCategoryDto = {
  id: 'cat-1',
  menuId: 'menu-1',
  name: 'Burgers',
  description: 'Beef and chicken burgers.',
  displayOrder: 1,
  isActive: true,
  createdAt: '2026-01-01',
  updatedAt: null,
  itemCount: 2
};

function menuWith(categories: MenuCategoryDto[]): MenuDetailsDto {
  return {
    id: 'menu-1',
    tenantId: 'tenant-1',
    restaurantId: 'restaurant-1',
    name: 'Demo Menu',
    description: null,
    isActive: true,
    status: 'Draft',
    createdAt: '2026-01-01',
    updatedAt: null,
    categories
  };
}

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

describe('MenuCategoryForm', () => {
  let httpMock: HttpTestingController;
  let navigate: ReturnType<typeof vi.fn>;
  let notification: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
  let routeParams: Record<string, string | null>;
  let routeQuery: Record<string, string | null>;

  beforeEach(() => {
    navigate = vi.fn(() => Promise.resolve(true));
    notification = { success: vi.fn(), error: vi.fn() };
    routeParams = { menuId: 'menu-1', categoryId: null };
    routeQuery = { returnTo: null, restaurantId: null };

    TestBed.configureTestingModule({
      imports: [MenuCategoryForm, HttpClientTestingModule],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => routeParams[key] ?? null
              },
              queryParamMap: {
                get: (key: string) => routeQuery[key] ?? null
              }
            }
          }
        },
        {
          provide: Router,
          useValue: { navigate }
        },
        {
          provide: NotificationService,
          useValue: notification
        }
      ]
    });

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  function createLoadedFixture(categories: MenuCategoryDto[] = []): ReturnType<typeof TestBed.createComponent<MenuCategoryForm>> {
    const fixture = TestBed.createComponent(MenuCategoryForm);
    fixture.detectChanges();

    httpMock.expectOne({ method: 'GET', url: MENU_URL }).flush(ok(menuWith(categories)));
    fixture.detectChanges();

    return fixture;
  }

  it('returns to the manage page when returnTo=manage', () => {
    routeQuery = { returnTo: 'manage', restaurantId: 'restaurant-1' };
    const fixture = createLoadedFixture();

    const cancel = fixture.nativeElement.querySelector(
      '.menu-form__actions button'
    ) as HTMLButtonElement;
    expect(cancel).not.toBeNull();
    cancel.click();

    expect(navigate).toHaveBeenCalledWith(
      ['/menus', 'menu-1', 'manage'],
      { queryParams: { restaurantId: 'restaurant-1' } }
    );
  });

  it('falls back to the menu detail page for an unsupported return destination', () => {
    routeQuery = { returnTo: 'https://example.com/steal', restaurantId: null };
    const fixture = createLoadedFixture();

    const cancel = fixture.nativeElement.querySelector(
      '.menu-form__actions button'
    ) as HTMLButtonElement;
    cancel.click();

    expect(navigate).toHaveBeenCalledWith(
      ['/menus', 'menu-1'],
      { queryParams: {} }
    );
  });

  it('creates a category and returns to the manage page', () => {
    routeQuery = { returnTo: 'manage', restaurantId: null };
    const fixture = createLoadedFixture();

    const nameInput = fixture.nativeElement.querySelector('#name') as HTMLInputElement;
    nameInput.value = 'Starters';
    nameInput.dispatchEvent(new Event('input'));

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('ngSubmit'));

    const request = httpMock.expectOne({
      method: 'POST',
      url: `${API_ROOT}/menus/menu-1/categories`
    });
    expect(request.request.body).toEqual({
      name: 'Starters',
      description: null,
      displayOrder: null
    });

    request.flush(ok({ ...category, name: 'Starters' }));
    fixture.detectChanges();

    expect(navigate).toHaveBeenCalledWith(
      ['/menus', 'menu-1', 'manage'],
      { queryParams: {} }
    );
  });

  it('loads and updates an existing category, then returns to manage', () => {
    routeParams = { menuId: 'menu-1', categoryId: 'cat-1' };
    routeQuery = { returnTo: 'manage', restaurantId: null };
    const fixture = createLoadedFixture([category]);

    const nameInput = fixture.nativeElement.querySelector('#name') as HTMLInputElement;
    expect(nameInput.value).toBe('Burgers');

    nameInput.value = 'Burgers & Fries';
    nameInput.dispatchEvent(new Event('input'));

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('ngSubmit'));

    const request = httpMock.expectOne({
      method: 'PUT',
      url: `${API_ROOT}/menu-categories/cat-1`
    });
    expect(request.request.body).toEqual({
      name: 'Burgers & Fries',
      description: 'Beef and chicken burgers.',
      displayOrder: 1
    });

    request.flush(ok({ ...category, name: 'Burgers & Fries' }));
    fixture.detectChanges();

    expect(navigate).toHaveBeenCalledWith(
      ['/menus', 'menu-1', 'manage'],
      { queryParams: {} }
    );
  });
});
