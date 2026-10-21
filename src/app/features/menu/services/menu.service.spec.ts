import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController
} from '@angular/common/http/testing';
import { MenuService } from './menu.service';
import type { ApiResponse } from '../../../core/models/api-response.model';
import type { MenuDto } from '../models/menu.model';

const API_ROOT = 'https://localhost:7182/api/v1';

function expectRequest(
  httpMock: HttpTestingController,
  method: string,
  url: string,
  body?: unknown
) {
  const req = httpMock.expectOne({ method, url });

  if (body !== undefined) {
    expect(req.request.body).toEqual(body);
  }

  return req;
}

describe('MenuService', () => {
  let service: MenuService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });

    service = TestBed.inject(MenuService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('getMenus requests the restaurant-scoped list with paging params', () => {
    service.getMenus('restaurant-1', 2, 10).subscribe();

    const req = expectRequest(
      httpMock,
      'GET',
      `${API_ROOT}/restaurants/restaurant-1/menus?page=2&pageSize=10`
    );

    req.flush({ success: true, data: { items: [], totalCount: 0 }, message: null, errorCode: null, errors: null, traceId: null } as ApiResponse<{ items: never[]; totalCount: number }>);
  });

  it('getMenu requests a single menu with its categories', () => {
    service.getMenu('menu-1').subscribe();

    const req = expectRequest(httpMock, 'GET', `${API_ROOT}/menus/menu-1`);

    req.flush({ success: true, data: { id: 'menu-1', name: 'Menu' }, message: null, errorCode: null, errors: null, traceId: null } as unknown as ApiResponse<MenuDto>);
  });

  it('createMenu posts to the restaurant-scoped menu collection', () => {
    service.createMenu('restaurant-1', { name: 'Winter Menu', description: null }).subscribe();

    const req = expectRequest(
      httpMock,
      'POST',
      `${API_ROOT}/restaurants/restaurant-1/menus`,
      { name: 'Winter Menu', description: null }
    );

    req.flush({ success: true, data: { id: 'menu-1' }, message: null, errorCode: null, errors: null, traceId: null } as ApiResponse<MenuDto>);
  });

  it('updateMenu puts the partial menu payload', () => {
    service.updateMenu('menu-1', { name: 'Renamed' }).subscribe();

    const req = expectRequest(
      httpMock,
      'PUT',
      `${API_ROOT}/menus/menu-1`,
      { name: 'Renamed' }
    );

    req.flush({ success: true, data: { id: 'menu-1', name: 'Renamed' }, message: null, errorCode: null, errors: null, traceId: null } as ApiResponse<MenuDto>);
  });

  it('setMenuActive patches the status endpoint', () => {
    service.setMenuActive('menu-1', false).subscribe();

    const req = expectRequest(
      httpMock,
      'PATCH',
      `${API_ROOT}/menus/menu-1/status`,
      { isActive: false }
    );

    req.flush({ success: true, data: { id: 'menu-1', isActive: false }, message: null, errorCode: null, errors: null, traceId: null } as ApiResponse<MenuDto>);
  });

  it('archiveMenu deletes the menu', () => {
    service.archiveMenu('menu-1').subscribe();

    expectRequest(httpMock, 'DELETE', `${API_ROOT}/menus/menu-1`);

    httpMock.expectNone(`${API_ROOT}/menus/*`);
  });

  it('getCategories lists categories of a menu', () => {
    service.getCategories('menu-1').subscribe();

    expectRequest(httpMock, 'GET', `${API_ROOT}/menus/menu-1/categories`);
  });

  it('createCategory posts a new category', () => {
    service.createCategory('menu-1', { name: 'Starters', description: null, displayOrder: 1 }).subscribe();

    const req = expectRequest(
      httpMock,
      'POST',
      `${API_ROOT}/menus/menu-1/categories`,
      { name: 'Starters', description: null, displayOrder: 1 }
    );

    req.flush({ success: true, data: { id: 'cat-1' }, message: null, errorCode: null, errors: null, traceId: null } as unknown as ApiResponse<never>);
  });

  it('updateCategory puts a partial category payload', () => {
    service.updateCategory('cat-1', { description: 'Updated' }).subscribe();

    const req = expectRequest(
      httpMock,
      'PUT',
      `${API_ROOT}/menu-categories/cat-1`,
      { description: 'Updated' }
    );

    req.flush({ success: true, data: { id: 'cat-1', description: 'Updated' }, message: null, errorCode: null, errors: null, traceId: null } as unknown as ApiResponse<never>);
  });

  it('setCategoryActive patches category status', () => {
    service.setCategoryActive('cat-1', false).subscribe();

    const req = expectRequest(
      httpMock,
      'PATCH',
      `${API_ROOT}/menu-categories/cat-1/status`,
      { isActive: false }
    );

    req.flush({ success: true, data: { id: 'cat-1', isActive: false }, message: null, errorCode: null, errors: null, traceId: null } as unknown as ApiResponse<never>);
  });

  it('deleteCategory deletes a category', () => {
    service.deleteCategory('cat-1').subscribe();

    expectRequest(httpMock, 'DELETE', `${API_ROOT}/menu-categories/cat-1`);
  });

  it('reorderCategories patches the full ordered id array', () => {
    service.reorderCategories('menu-1', ['cat-2', 'cat-1']).subscribe();

    const req = expectRequest(
      httpMock,
      'PATCH',
      `${API_ROOT}/menus/menu-1/categories/order`,
      { orderedCategoryIds: ['cat-2', 'cat-1'] }
    );

    req.flush({ success: true, data: [], message: null, errorCode: null, errors: null, traceId: null } as unknown as ApiResponse<never[]>);
  });

  it('getCategoryItems lists paged items of a category', () => {
    service.getCategoryItems('cat-1', 3, 20).subscribe();

    const req = expectRequest(
      httpMock,
      'GET',
      `${API_ROOT}/menu-categories/cat-1/items?page=3&pageSize=20`
    );

    req.flush({ success: true, data: { items: [], totalCount: 0 }, message: null, errorCode: null, errors: null, traceId: null } as ApiResponse<{ items: never[]; totalCount: number }>);
  });

  it('getMenuItems lists paged items of a menu', () => {
    service.getMenuItems('menu-1', 1, 50).subscribe();

    const req = expectRequest(
      httpMock,
      'GET',
      `${API_ROOT}/menus/menu-1/items?page=1&pageSize=50`
    );

    req.flush({ success: true, data: { items: [], totalCount: 0 }, message: null, errorCode: null, errors: null, traceId: null } as ApiResponse<{ items: never[]; totalCount: number }>);
  });

  it('createItem posts a new item to a category', () => {
    service.createItem('cat-1', {
      name: 'Nihari',
      price: 12.5,
      description: null,
      currency: 'PKR',
      imageFileId: null,
      displayOrder: 1
    }).subscribe();

    const req = expectRequest(
      httpMock,
      'POST',
      `${API_ROOT}/menu-categories/cat-1/items`,
      {
        name: 'Nihari',
        price: 12.5,
        description: null,
        currency: 'PKR',
        imageFileId: null,
        displayOrder: 1
      }
    );

    req.flush({ success: true, data: { id: 'item-1' }, message: null, errorCode: null, errors: null, traceId: null } as unknown as ApiResponse<never>);
  });

  it('getItem requests a single item', () => {
    service.getItem('item-1').subscribe();

    expectRequest(httpMock, 'GET', `${API_ROOT}/menu-items/item-1`);
  });

  it('updateItem puts a partial item payload', () => {
    service.updateItem('item-1', { price: 13.0, isAvailable: false }).subscribe();

    const req = expectRequest(httpMock, 'PUT', `${API_ROOT}/menu-items/item-1`);

    expect(req.request.body.price).toBe(13.0);
    expect(req.request.body.clearImage).toBe(false);

    req.flush({ success: true, data: { id: 'item-1', price: 13.0 }, message: null, errorCode: null, errors: null, traceId: null } as unknown as ApiResponse<never>);
  });

  it('setItemAvailability patches item availability', () => {
    service.setItemAvailability('item-1', false).subscribe();

    const req = expectRequest(
      httpMock,
      'PATCH',
      `${API_ROOT}/menu-items/item-1/availability`,
      { isAvailable: false }
    );

    req.flush({ success: true, data: { id: 'item-1', isAvailable: false }, message: null, errorCode: null, errors: null, traceId: null } as unknown as ApiResponse<never>);
  });

  it('setItemActive patches item status', () => {
    service.setItemActive('item-1', false).subscribe();

    const req = expectRequest(
      httpMock,
      'PATCH',
      `${API_ROOT}/menu-items/item-1/status`,
      { isActive: false }
    );

    req.flush({ success: true, data: { id: 'item-1', isActive: false }, message: null, errorCode: null, errors: null, traceId: null } as unknown as ApiResponse<never>);
  });

  it('deleteItem soft-deletes an item', () => {
    service.deleteItem('item-1').subscribe();

    expectRequest(httpMock, 'DELETE', `${API_ROOT}/menu-items/item-1`);
  });
});
