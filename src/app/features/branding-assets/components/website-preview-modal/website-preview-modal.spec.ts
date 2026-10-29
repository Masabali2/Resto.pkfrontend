import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WebsitePreviewModal } from './website-preview-modal';
import { MenuService } from '../../../menu/services/menu.service';
import { of } from 'rxjs';
import type { MenuCategoryDto } from '../../../menu/models/menu-category.model';
import type { MenuItemDto } from '../../../menu/models/menu-item.model';

const mockMenuService = {
  getMenus: vi.fn(() => of({ success: true, data: { items: [] } })),
  getCategories: vi.fn(() => of({ success: true, data: [] })),
  getMenuItems: vi.fn(() => of({ success: true, data: { items: [] } }))
};

describe('WebsitePreviewModal', () => {
  let component: WebsitePreviewModal;
  let fixture: ComponentFixture<WebsitePreviewModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WebsitePreviewModal],
      providers: [{ provide: MenuService, useValue: mockMenuService }]
    }).compileComponents();

    fixture = TestBed.createComponent(WebsitePreviewModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should default inputs', () => {
    expect(component.restaurant()).toBeNull();
    expect(component.logoUrl()).toBe('');
    expect(component.heroBannerUrl()).toBe('');
    expect(component.open()).toBe(false);
  });

  it('closePreview should set previewOpen false and emit close', () => {
    let emitted = false;
    component.close.subscribe(() => (emitted = true));
    component.previewOpen.set(true);
    component.closePreview();
    expect(component.previewOpen()).toBe(false);
    expect(emitted).toBe(true);
  });

  it('restaurantSlug should derive a slug from the restaurant name', () => {
    (component as any).restaurant.set({ id: 'r1', name: 'My Restaurant' });
    expect(component.restaurantSlug()).toBe('my-restaurant');
  });

  it('restaurantSlug should fall back to restaurant when no name', () => {
    (component as any).restaurant.set({ id: 'r1', name: '' });
    expect(component.restaurantSlug()).toBe('restaurant');
  });

  it('visibleItems should return all items when no category selected', () => {
    const items = [
      { id: 'i1', menuCategoryId: 'c1', name: 'Item 1', description: '', price: 10, currency: 'PKR' } as MenuItemDto,
      { id: 'i2', menuCategoryId: 'c2', name: 'Item 2', description: '', price: 20, currency: 'PKR' } as MenuItemDto
    ];
    (component as any).items.set(items);
    (component as any).activeCategoryId.set(null);
    expect((component as any).visibleItems()).toEqual(items);
  });

  it('visibleItems should filter by active category', () => {
    const items = [
      { id: 'i1', menuCategoryId: 'c1', name: 'Item 1', description: '', price: 10, currency: 'PKR' } as MenuItemDto,
      { id: 'i2', menuCategoryId: 'c2', name: 'Item 2', description: '', price: 20, currency: 'PKR' } as MenuItemDto
    ];
    (component as any).items.set(items);
    (component as any).activeCategoryId.set('c1');
    expect((component as any).visibleItems()).toEqual([items[0]]);
  });

  it('categoryName should return category name or fallback', () => {
    (component as any).categories.set([{ id: 'c1', name: 'Burgers', restaurantId: 'r1' } as unknown as MenuCategoryDto]);
    expect((component as any).categoryName('c1')).toBe('Burgers');
    expect((component as any).categoryName('missing')).toBe('Category');
  });

  it('formatPrice should prefix PKR for PKR currency', () => {
    expect((component as any).formatPrice(1450, 'PKR')).toBe('PKR 1,450');
  });

  it('formatPrice should use currency as-is for non-PKR', () => {
    expect((component as any).formatPrice(100, 'USD')).toBe('USD 100');
  });
});
