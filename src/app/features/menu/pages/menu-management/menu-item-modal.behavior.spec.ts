import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController
} from '@angular/common/http/testing';
import { MenuItemModal } from './menu-item-modal';
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

describe('MenuItemModal interaction & update', () => {
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

  function openEditForm(fixture: ReturnType<typeof TestBed.createComponent<MenuItemModal>>): void {
    fixture.componentRef.setInput('mode', 'edit');
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('item', item);
    fixture.componentRef.setInput('categories', [category]);
    // Run change detection so the constructor effect issues the GET item request.
    fixture.detectChanges();
    httpMock.expectOne(`${API_ROOT}/menu-items/item-1`).flush({
      success: true,
      data: item
    } as ApiResponse<MenuItemDto>);
    fixture.detectChanges();
  }

  it('does not close the form when clicking inside on an input', () => {
    const fixture = TestBed.createComponent(MenuItemModal);
    const component = fixture.componentInstance;
    const cancelled = vi.fn();
    component.cancelled.subscribe(cancelled);

    openEditForm(fixture);

    const nameInput = fixture.nativeElement.querySelector('#modal-name') as HTMLInputElement;
    expect(nameInput).not.toBeNull();
    nameInput.click();

    expect(cancelled).not.toHaveBeenCalled();
  });

  it('does not close the form when clicking inside on the availability checkbox', () => {
    const fixture = TestBed.createComponent(MenuItemModal);
    const component = fixture.componentInstance;
    const cancelled = vi.fn();
    component.cancelled.subscribe(cancelled);

    openEditForm(fixture);

    const checkbox = fixture.nativeElement.querySelector(
      'input[formControlName="isAvailable"]'
    ) as HTMLInputElement;
    expect(checkbox).not.toBeNull();
    checkbox.click();

    expect(cancelled).not.toHaveBeenCalled();
  });

  it('does not close the form when clicking a tab button inside the form', () => {
    const fixture = TestBed.createComponent(MenuItemModal);
    const component = fixture.componentInstance;
    const cancelled = vi.fn();
    component.cancelled.subscribe(cancelled);

    openEditForm(fixture);

    const tab = fixture.nativeElement.querySelector(
      '.modal__tab'
    ) as HTMLButtonElement;
    expect(tab).not.toBeNull();
    tab.click();

    expect(cancelled).not.toHaveBeenCalled();
  });

  it('does not submit the form when typing into an input', () => {
    const fixture = TestBed.createComponent(MenuItemModal);
    const component = fixture.componentInstance;
    const saved = vi.fn();
    component.saved.subscribe(saved);

    openEditForm(fixture);

    const nameInput = fixture.nativeElement.querySelector('#modal-name') as HTMLInputElement;
    nameInput.value = 'Updated Burger';
    nameInput.dispatchEvent(new Event('input', { bubbles: true }));

    expect(saved).not.toHaveBeenCalled();
  });

  it('closes the form only when clicking the backdrop outside the dialog', () => {
    const fixture = TestBed.createComponent(MenuItemModal);
    const component = fixture.componentInstance;
    const cancelled = vi.fn();
    component.cancelled.subscribe(cancelled);

    openEditForm(fixture);

    const overlay = fixture.nativeElement.querySelector('.modal-overlay') as HTMLElement;
    expect(overlay).not.toBeNull();
    overlay.click();

    expect(cancelled).toHaveBeenCalled();
  });

  it('sends a PUT update request for the correct item id on save', () => {
    const fixture = TestBed.createComponent(MenuItemModal);
    fixture.componentRef.setInput('mode', 'edit');
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('item', item);
    fixture.componentRef.setInput('categories', [category]);
    fixture.detectChanges();
    httpMock.expectOne(`${API_ROOT}/menu-items/item-1`).flush({
      success: true,
      data: item
    } as ApiResponse<MenuItemDto>);
    fixture.detectChanges();

    const nameInput = fixture.nativeElement.querySelector('#modal-name') as HTMLInputElement;
    nameInput.value = 'Updated Burger';
    nameInput.dispatchEvent(new Event('input', { bubbles: true }));
    const priceInput = fixture.nativeElement.querySelector('#modal-price') as HTMLInputElement;
    priceInput.value = '15.75';
    priceInput.dispatchEvent(new Event('input', { bubbles: true }));

    const form = fixture.nativeElement.querySelector('form');
    form.dispatchEvent(new Event('ngSubmit'));

    const req = httpMock.expectOne({
      method: 'PUT',
      url: `${API_ROOT}/menu-items/item-1`
    });
    expect(req.request.body).toEqual({
      name: 'Updated Burger',
      description: 'Tasty',
      price: 15.75,
      currency: 'PKR',
      imageFileId: null,
      clearImage: false,
      displayOrder: 1,
      isAvailable: true
    });
  });

  it('does not send an update request when the form is invalid', () => {
    const fixture = TestBed.createComponent(MenuItemModal);
    fixture.componentRef.setInput('mode', 'edit');
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('item', item);
    fixture.componentRef.setInput('categories', [category]);
    fixture.detectChanges();
    httpMock.expectOne(`${API_ROOT}/menu-items/item-1`).flush({
      success: true,
      data: item
    } as ApiResponse<MenuItemDto>);
    fixture.detectChanges();

    const nameInput = fixture.nativeElement.querySelector('#modal-name') as HTMLInputElement;
    nameInput.value = '';
    nameInput.dispatchEvent(new Event('input', { bubbles: true }));

    const form = fixture.nativeElement.querySelector('form');
    form.dispatchEvent(new Event('ngSubmit'));

    httpMock.expectNone(`${API_ROOT}/menu-items/item-1`);
  });
});
