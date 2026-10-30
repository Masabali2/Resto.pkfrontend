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

const API_ROOT = 'https://localhost:7182/api/v1';

describe('MenuItemModal', () => {
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

  it('initializes a clean create form with the first category selected', () => {
    const fixture = TestBed.createComponent(MenuItemModal);
    fixture.componentRef.setInput('mode', 'create');
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('categories', [
      {
        id: 'cat-1',
        menuId: 'menu-1',
        name: 'Burgers',
        description: null,
        displayOrder: 0,
        isActive: true,
        createdAt: '2026-01-01',
        updatedAt: null,
        itemCount: 2
      } as MenuCategoryDto
    ]);
    fixture.detectChanges();

    const nameInput = fixture.nativeElement.querySelector('#modal-name') as HTMLInputElement;
    expect(nameInput.value).toBe('');
    const categorySelect = fixture.nativeElement.querySelector('#modal-category') as HTMLSelectElement;
    expect(categorySelect.value).toBe('cat-1');
  });

  it('sends a create request with the selected category and form values', () => {
    const fixture = TestBed.createComponent(MenuItemModal);
    fixture.componentRef.setInput('mode', 'create');
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('categories', [
      {
        id: 'cat-1',
        menuId: 'menu-1',
        name: 'Burgers',
        description: null,
        displayOrder: 0,
        isActive: true,
        createdAt: '2026-01-01',
        updatedAt: null,
        itemCount: 2
      } as MenuCategoryDto
    ]);
    fixture.detectChanges();

    const nameInput = fixture.nativeElement.querySelector('#modal-name') as HTMLInputElement;
    nameInput.value = 'Cheeseburger';
    nameInput.dispatchEvent(new Event('input'));
    const priceInput = fixture.nativeElement.querySelector('#modal-price') as HTMLInputElement;
    priceInput.value = '12.50';
    priceInput.dispatchEvent(new Event('input'));

    const form = fixture.nativeElement.querySelector('form');
    form.dispatchEvent(new Event('ngSubmit'));

    const req = httpMock.expectOne({
      method: 'POST',
      url: `${API_ROOT}/menu-categories/cat-1/items`
    });
    expect(req.request.body).toEqual({
      name: 'Cheeseburger',
      price: 12.5,
      description: null,
      currency: 'USD',
      imageFileId: null,
      displayOrder: null,
      isAvailable: true
    });
  });

  it('populates the form in edit mode from the item input', () => {
    const item: MenuItemDto = {
      id: 'item-1',
      menuCategoryId: 'cat-1',
      menuId: 'menu-1',
      name: 'Cheeseburger',
      description: 'Tasty',
      price: 12.5,
      currency: 'USD',
      imageFileId: null,
      displayOrder: 1,
      isAvailable: true,
      isActive: true,
      createdAt: '2026-01-01',
      updatedAt: null,
      categoryName: 'Burgers',
      imageUrl: null
    };
    const fixture = TestBed.createComponent(MenuItemModal);
    fixture.componentRef.setInput('mode', 'edit');
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('item', item);
    fixture.detectChanges();

    const nameInput = fixture.nativeElement.querySelector('#modal-name') as HTMLInputElement;
    expect(nameInput.value).toBe('Cheeseburger');
    const priceInput = fixture.nativeElement.querySelector('#modal-price') as HTMLInputElement;
    expect(priceInput.value).toBe('12.50');
  });
});
