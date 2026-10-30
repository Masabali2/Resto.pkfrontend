import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController
} from '@angular/common/http/testing';
import { MenuItemModal } from './menu-item-modal';
import { MenuService } from '../../services/menu.service';
import type { MenuItemDto } from '../../models/menu-item.model';
import type { MenuCategoryDto } from '../../models/menu-category.model';
import type { ApiResponse } from '../../../../core/models/api-response.model';
import { vi } from 'vitest';

const API_ROOT = 'https://localhost:7182/api/v1';

const category: MenuCategoryDto = {
  id: 'cat-1',
  menuId: 'menu-1',
  name: 'Burgers',
  description: null,
  displayOrder: 0,
  isActive: true,
  createdAt: '2026-01-01',
  updatedAt: null,
  itemCount: 2
} as MenuCategoryDto;

const item: MenuItemDto = {
  id: 'item-1',
  menuCategoryId: 'cat-1',
  menuId: 'menu-1',
  name: 'Cheeseburger',
  description: 'Tasty',
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

function flushItem(httpMock: HttpTestingController): void {
  httpMock.expectOne(`${API_ROOT}/menu-items/item-1`).flush({
    success: true,
    data: item
  } as ApiResponse<MenuItemDto>);
}

describe('MenuItemModal click-inside reproduction', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MenuItemModal, HttpClientTestingModule]
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  function openEditModal(
    fixture: ReturnType<typeof TestBed.createComponent<MenuItemModal>>
  ): void {
    const component = fixture.componentInstance;
    fixture.componentRef.setInput('mode', 'edit');
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('item', item);
    fixture.componentRef.setInput('categories', [category]);
    // Setting the inputs and running change detection triggers the effect,
    // which issues the GET item request.
    fixture.detectChanges();
    flushItem(httpMock);
    // Responding to the request sets loading(false) and renders the form.
    fixture.detectChanges();
  }

  it('does not emit cancelled when clicking on an input inside the form', () => {
    const fixture = TestBed.createComponent(MenuItemModal);
    const component = fixture.componentInstance;
    const cancelled = vi.fn();
    component.cancelled.subscribe(cancelled);

    openEditModal(fixture);

    const nameInput = fixture.nativeElement.querySelector(
      '#modal-name'
    ) as HTMLInputElement;
    expect(nameInput).not.toBeNull();
    nameInput.click();

    expect(cancelled).not.toHaveBeenCalled();
  });

  it('does not emit cancelled when clicking the category select inside the form', () => {
    const fixture = TestBed.createComponent(MenuItemModal);
    const component = fixture.componentInstance;
    const cancelled = vi.fn();
    component.cancelled.subscribe(cancelled);

    fixture.componentRef.setInput('mode', 'create');
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('categories', [category]);
    fixture.detectChanges();

    const select = fixture.nativeElement.querySelector(
      '#modal-category'
    ) as HTMLSelectElement;
    expect(select).not.toBeNull();
    select.click();

    expect(cancelled).not.toHaveBeenCalled();
  });

  it('does not emit saved when typing into an input', () => {
    const fixture = TestBed.createComponent(MenuItemModal);
    const component = fixture.componentInstance;
    const saved = vi.fn();
    component.saved.subscribe(saved);

    openEditModal(fixture);

    const nameInput = fixture.nativeElement.querySelector(
      '#modal-name'
    ) as HTMLInputElement;
    nameInput.value = 'Updated Name';
    nameInput.dispatchEvent(new Event('input', { bubbles: true }));

    expect(saved).not.toHaveBeenCalled();
  });

  it('emits cancelled when clicking the overlay backdrop outside the dialog', () => {
    const fixture = TestBed.createComponent(MenuItemModal);
    const component = fixture.componentInstance;
    const cancelled = vi.fn();
    component.cancelled.subscribe(cancelled);

    openEditModal(fixture);

    const overlay = fixture.nativeElement.querySelector(
      '.modal-overlay'
    ) as HTMLElement;
    expect(overlay).not.toBeNull();
    overlay.click();

    expect(cancelled).toHaveBeenCalled();
  });
});
