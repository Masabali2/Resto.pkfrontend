import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal
} from '@angular/core';
import { DatePipe, NgIf, NgForOf } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { MenuService } from '../../services/menu.service';
import { AuthorizationService } from '../../../../core/services/authorization.service';
import { TenantContextService } from '../../../../core/services/tenant-context.service';
import { HttpErrorHandlerService } from '../../../../core/services/http-error-handler.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ConfirmationDialog } from '../../../../shared/components/confirmation-dialog/confirmation-dialog';
import { Button } from '../../../../shared/components/button/button';
import { LoadingSpinner } from '../../../../shared/components/loading-spinner/loading-spinner';
import type { ApiResponse } from '../../../../core/models/api-response.model';
import type { MenuDetailsDto } from '../../models/menu.model';
import type { MenuCategoryDto } from '../../models/menu-category.model';
import type { MenuItemDto } from '../../models/menu-item.model';

type PageState = 'loading' | 'list' | 'not-found' | 'no-workspace' | 'forbidden' | 'error';

interface CategoryItemState {
  items: MenuItemDto[];
  page: number;
  pageSize: number;
  totalCount: number;
  loading: boolean;
  error: string | null;
}

@Component({
  selector: 'app-menu-detail',
  standalone: true,
  imports: [
    DatePipe,
    NgIf,
    NgForOf,
    RouterLink,
    Button,
    LoadingSpinner,
    ConfirmationDialog
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './menu-detail.html',
  styleUrl: './menu-detail.css'
})
export class MenuDetail {
  private readonly menuService = inject(MenuService);
  private readonly authorization = inject(AuthorizationService);
  private readonly tenantContext = inject(TenantContextService);
  private readonly httpErrorHandler = inject(HttpErrorHandlerService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly pageState = signal<PageState>('loading');
  protected readonly errorMessage = signal('');
  protected readonly menu = signal<MenuDetailsDto | null>(null);
  protected readonly categoryItemState = signal<Record<string, CategoryItemState>>({});
  protected readonly expandedCategoryIds = signal<Set<string>>(new Set());

  protected readonly dialogOpen = signal(false);
  protected readonly dialogKind = signal<'category' | 'item' | null>(null);
  protected readonly dialogTarget = signal<{ id: string; name: string } | null>(null);

  protected readonly canUpdateMenu = computed(() =>
    this.authorization.hasPermission('Menu.Update')
  );
  protected readonly canCreateCategory = computed(() =>
    this.authorization.hasPermission('MenuCategory.Create')
  );
  protected readonly canManageCategories = computed(() =>
    this.authorization.hasPermission('MenuCategory.Update')
  );
  protected readonly canDeleteCategory = computed(() =>
    this.authorization.hasPermission('MenuCategory.Delete')
  );
  protected readonly canCreateItem = computed(() =>
    this.authorization.hasPermission('MenuItem.Create')
  );
  protected readonly canManageItems = computed(() =>
    this.authorization.hasPermission('MenuItem.Update')
  );
  protected readonly canDeleteItem = computed(() =>
    this.authorization.hasPermission('MenuItem.Delete')
  );

  protected readonly isArchived = computed(() =>
    this.menu()?.status === 'Archived'
  );

  private loadedTenantId: string | null = null;
  private requestSequence = 0;

  constructor() {
    toObservable(this.tenantContext.activeTenantId)
      .pipe(takeUntilDestroyed())
      .subscribe(tenantId => {
        if (tenantId === this.loadedTenantId) {
          return;
        }

        this.loadedTenantId = tenantId;
        this.pageState.set('loading');
        this.errorMessage.set('');
        this.menu.set(null);
        this.categoryItemState.set({});
        this.expandedCategoryIds.set(new Set());

        const menuId = this.route.snapshot.paramMap.get('menuId');
        if (menuId) {
          this.loadMenu(menuId);
        }
      });

    this.route.paramMap
      .pipe(takeUntilDestroyed())
      .subscribe(params => {
        const menuId = params.get('menuId');
        if (!menuId) {
          return;
        }

        this.loadMenu(menuId);
      });
  }

  private loadMenu(menuId: string): void {
    const tenantId = this.tenantContext.activeTenantId();
    if (tenantId === null) {
      this.pageState.set('no-workspace');
      return;
    }

    const requestId = ++this.requestSequence;
    this.loadedTenantId = tenantId;
    this.pageState.set('loading');
    this.errorMessage.set('');

    this.menuService.getMenu(menuId)
      .pipe(finalize(() => {}))
      .subscribe({
        next: (response: ApiResponse<MenuDetailsDto>) => {
          if (!this.isCurrent(requestId, tenantId)) {
            return;
          }

          if (!response.success || !response.data) {
            this.errorMessage.set(response.message ?? 'Unable to load the menu.');
            this.pageState.set('error');
            return;
          }

          this.menu.set(response.data!);
          this.pageState.set('list');
        },
        error: (error: unknown) => {
          if (!this.isCurrent(requestId, tenantId)) {
            return;
          }

          if (error instanceof HttpErrorResponse) {
            if (error.status === 404) {
              this.pageState.set('not-found');
              return;
            }

            if (error.status === 403) {
              this.pageState.set('forbidden');
              return;
            }
          }

          this.errorMessage.set(
            this.httpErrorHandler.extractBackendMessage(error) ??
              'Unable to load the menu. Please try again.'
          );
          this.pageState.set('error');
        }
      });
  }

  protected retry(): void {
    const menuId = this.route.snapshot.paramMap.get('menuId');
    if (menuId) {
      this.loadMenu(menuId);
    }
  }

  protected menuName(): string {
    return this.menu()?.name ?? '';
  }

  protected setMenuActive(isActive: boolean): void {
    const menu = this.menu();
    if (!menu || !this.canUpdateMenu() || this.isArchived()) {
      return;
    }

    this.menuService.setMenuActive(menu.id, isActive).subscribe({
        next: response => {
          if (!response.success || !response.data) {
            this.errorMessage.set(response.message ?? 'Unable to update the menu.');
            return;
          }

          const updated = response.data!;
          this.menu.update(m => (m ? { ...m, isActive: updated.isActive } : null));
          this.notificationService.success(
            `Menu "${updated.name}" ${updated.isActive ? 'activated' : 'deactivated'}.`
          );
        },
      error: error => {
        this.errorMessage.set(
          this.httpErrorHandler.extractBackendMessage(error) ??
            'Unable to update the menu. Please try again.'
        );
      }
    });
  }

  protected editMenu(): void {
    const menu = this.menu();
    if (!menu || !this.canUpdateMenu()) {
      return;
    }

    void this.router.navigate(['/menus', menu.id, 'edit'], {
      queryParams: { restaurantId: menu.restaurantId },
      queryParamsHandling: 'merge'
    });
  }

  protected categoryDisplayOrder(index: number): number {
    return index + 1;
  }

  protected getCategoryIndex(categoryId: string): number {
    const categories = this.menu()?.categories ?? [];
    return categories.findIndex(c => c.id === categoryId);
  }

  protected trackByCategoryId(_index: number, category: MenuCategoryDto): string {
    return category.id;
  }

  protected trackByItemId(_index: number, item: MenuItemDto): string {
    return item.id;
  }

  protected totalPages(categoryId: string): number {
    const page = this.categoryPage(categoryId);

    if (!page) {
      return 1;
    }

    return Math.max(1, Math.ceil(page.totalCount / page.pageSize));
  }

  protected createCategory(): void {
    const menu = this.menu();
    if (!menu || !this.canCreateCategory()) {
      return;
    }

    void this.router.navigate(['/menus', menu.id, 'categories', 'new'], {
      queryParams: { restaurantId: menu.restaurantId },
      queryParamsHandling: 'merge'
    });
  }

  protected editCategory(category: MenuCategoryDto): void {
    const menu = this.menu();
    if (!menu || !this.canManageCategories()) {
      return;
    }

    void this.router.navigate(['/menus', menu.id, 'categories', category.id, 'edit'], {
      queryParams: { restaurantId: menu.restaurantId },
      queryParamsHandling: 'merge'
    });
  }

  protected toggleCategoryActive(category: MenuCategoryDto, isActive: boolean): void {
    const menu = this.menu();
    if (!menu || !this.canManageCategories() || this.isArchived()) {
      return;
    }

    this.menuService.setCategoryActive(category.id, isActive).subscribe({
      next: response => {
        if (!response.success || !response.data) {
          this.errorMessage.set(response.message ?? 'Unable to update the category.');
          return;
        }

        const updated = response.data;
        this.menu.update(m => {
          if (!m) return null;
          return {
            ...m,
            categories: m.categories.map(c =>
              c.id === updated.id ? { ...c, isActive: updated.isActive } : c
            )
          } as MenuDetailsDto;
        });
        this.notificationService.success(
          `Category "${updated.name}" ${updated.isActive ? 'activated' : 'deactivated'}.`
        );
      },
      error: error => {
        this.errorMessage.set(
          this.httpErrorHandler.extractBackendMessage(error) ??
            'Unable to update the category. Please try again.'
        );
      }
    });
  }

  protected openDeleteCategoryDialog(category: MenuCategoryDto): void {
    if (!this.canDeleteCategory() || this.isArchived()) {
      return;
    }

    this.dialogKind.set('category');
    this.dialogTarget.set({ id: category.id, name: category.name });
    this.dialogOpen.set(true);
  }

  protected deleteCategory(): void {
    const target = this.dialogTarget();
    if (!target || this.dialogKind() !== 'category') {
      return;
    }

    this.dialogOpen.set(false);
    this.dialogKind.set(null);
    this.dialogTarget.set(null);

    this.menuService.deleteCategory(target.id).subscribe({
      next: () => {
        const menu = this.menu();
        if (!menu) return;
        this.menu.update(m => {
          if (!m) return null;
          return {
            ...m,
            categories: m.categories.filter(c => c.id !== target.id)
          };
        });
        this.categoryItemState.update(states => {
          const { [target.id]: _removed, ...rest } = states;
          return rest;
        });
        this.notificationService.success(`"${target.name}" has been deleted.`);
      },
      error: error => {
        if (error instanceof HttpErrorResponse && error.status === 409) {
          this.errorMessage.set(
            this.httpErrorHandler.extractBackendMessage(error) ??
              'This category still has menu items. Deactivate it or remove the items first.'
          );
          return;
        }

        this.errorMessage.set(
          this.httpErrorHandler.extractBackendMessage(error) ??
            'Unable to delete the category. Please try again.'
        );
      }
    });
  }

  protected cancelDialog(): void {
    this.dialogOpen.set(false);
    this.dialogKind.set(null);
    this.dialogTarget.set(null);
  }

  protected dialogConfirmMessage(): string {
    const target = this.dialogTarget();

    return target ? `Are you sure you want to delete "${target.name}"?` : '';
  }

  protected toggleCategory(categoryId: string): void {
    const menu = this.menu();
    const category = menu?.categories.find(c => c.id === categoryId);
    if (!category) {
      return;
    }

    const expanded = new Set(this.expandedCategoryIds());
    if (expanded.has(categoryId)) {
      expanded.delete(categoryId);
    } else {
      expanded.add(categoryId);
      this.loadCategoryItems(categoryId, 1);
    }
    this.expandedCategoryIds.set(expanded);
  }

  protected isCategoryExpanded(categoryId: string): boolean {
    return this.expandedCategoryIds().has(categoryId);
  }

  protected loadCategoryItems(categoryId: string, page = 1): void {
    const current = this.categoryItemState();
    const existing = current[categoryId];
    if (existing?.loading) {
      return;
    }

    const menu = this.menu();
    if (!menu) {
      return;
    }

    this.categoryItemState.update(states => ({
      ...states,
      [categoryId]: {
        ...(existing ?? { items: [], page: 1, pageSize: 20, totalCount: 0, loading: false, error: null }),
        loading: true,
        error: null
      }
    }));

    this.menuService.getCategoryItems(categoryId, page, 20).subscribe({
      next: response => {
        if (!response.success || !response.data) {
          this.categoryItemState.update(states => ({
            ...states,
            [categoryId]: {
              ...(states[categoryId] ?? { items: [], page, pageSize: 20, totalCount: 0, loading: false, error: null }),
              loading: false,
              error: response.message ?? 'Unable to load items.'
            }
          }));
          return;
        }

        const data = response.data;
        this.categoryItemState.update(states => ({
          ...states,
          [categoryId]: {
            items: data.items ?? [],
            page: data.page ?? page,
            pageSize: data.pageSize ?? 20,
            totalCount: data.totalCount ?? 0,
            loading: false,
            error: null
          }
        }));
      },
      error: error => {
        this.categoryItemState.update(states => ({
          ...states,
          [categoryId]: {
            ...(states[categoryId] ?? { items: [], page, pageSize: 20, totalCount: 0, loading: false, error: null }),
            loading: false,
            error: this.httpErrorHandler.extractBackendMessage(error) ?? 'Unable to load items.'
          }
        }));
      }
    });
  }

  protected categoryItems(categoryId: string): MenuItemDto[] {
    return this.categoryItemState()[categoryId]?.items ?? [];
  }

  protected categoryPage(categoryId: string): { page: number; pageSize: number; totalCount: number } | null {
    const s = this.categoryItemState()[categoryId];
    if (!s) {
      return null;
    }

    return { page: s.page, pageSize: s.pageSize, totalCount: s.totalCount };
  }

  protected categoryError(categoryId: string): string | null {
    return this.categoryItemState()[categoryId]?.error ?? null;
  }

  protected categoryItemsLoading(categoryId: string): boolean {
    return !!this.categoryItemState()[categoryId]?.loading;
  }

  protected createItem(categoryId: string): void {
    const menu = this.menu();
    if (!menu || !this.canCreateItem() || this.isArchived()) {
      return;
    }

    void this.router.navigate(['/menus', menu.id, 'categories', categoryId, 'items', 'new'], {
      queryParams: { restaurantId: menu.restaurantId },
      queryParamsHandling: 'merge'
    });
  }

  protected editItem(categoryId: string, item: MenuItemDto): void {
    const menu = this.menu();
    if (!menu || !this.canManageItems() || this.isArchived()) {
      return;
    }

    void this.router.navigate(['/menus', menu.id, 'categories', categoryId, 'items', item.id, 'edit'], {
      queryParams: { restaurantId: menu.restaurantId },
      queryParamsHandling: 'merge'
    });
  }

  protected toggleItemAvailability(item: MenuItemDto, isAvailable: boolean): void {
    const menu = this.menu();
    if (!menu || !this.canManageItems() || this.isArchived()) {
      return;
    }

    this.menuService.setItemAvailability(item.id, isAvailable).subscribe({
      next: response => {
        if (!response.success || !response.data) {
          this.errorMessage.set(response.message ?? 'Unable to update availability.');
          return;
        }

        this.updateItemInCategory(response.data);
        this.notificationService.success(
          `Item "${response.data.name}" ${response.data.isAvailable ? 'available' : 'unavailable'}.`
        );
      },
      error: error => {
        this.errorMessage.set(
          this.httpErrorHandler.extractBackendMessage(error) ??
            'Unable to update availability. Please try again.'
        );
      }
    });
  }

  protected toggleItemActive(item: MenuItemDto, isActive: boolean): void {
    const menu = this.menu();
    if (!menu || !this.canManageItems() || this.isArchived()) {
      return;
    }

    this.menuService.setItemActive(item.id, isActive).subscribe({
      next: response => {
        if (!response.success || !response.data) {
          this.errorMessage.set(response.message ?? 'Unable to update the item.');
          return;
        }

        this.updateItemInCategory(response.data);
        this.notificationService.success(
          `Item "${response.data.name}" ${response.data.isActive ? 'activated' : 'deactivated'}.`
        );
      },
      error: error => {
        this.errorMessage.set(
          this.httpErrorHandler.extractBackendMessage(error) ??
            'Unable to update the item. Please try again.'
        );
      }
    });
  }

  protected openDeleteItemDialog(item: MenuItemDto): void {
    if (!this.canDeleteItem() || this.isArchived()) {
      return;
    }

    this.dialogKind.set('item');
    this.dialogTarget.set({ id: item.id, name: item.name });
    this.dialogOpen.set(true);
  }

  protected deleteItem(): void {
    const target = this.dialogTarget();
    if (!target || this.dialogKind() !== 'item') {
      return;
    }

    this.dialogOpen.set(false);
    this.dialogKind.set(null);
    this.dialogTarget.set(null);

    // Find the category the item belongs to so we can refresh its page.
    let categoryId = '';
    for (const [cid, state] of Object.entries(this.categoryItemState())) {
      if (state.items.some(i => i.id === target.id)) {
        categoryId = cid;
        break;
      }
    }

    this.menuService.deleteItem(target.id).subscribe({
      next: () => {
        this.removeItemFromCategory(target.id);
        if (categoryId) {
          this.loadCategoryItems(categoryId, this.categoryItemState()[categoryId]?.page ?? 1);
        }
        this.notificationService.success(`"${target.name}" has been deleted.`);
      },
      error: error => {
        this.errorMessage.set(
          this.httpErrorHandler.extractBackendMessage(error) ??
            'Unable to delete the item. Please try again.'
        );
      }
    });
  }

  protected moveCategory(categoryId: string, direction: 'up' | 'down'): void {
    const menu = this.menu();
    if (!menu || !this.canManageCategories() || this.isArchived()) {
      return;
    }

    const cats = [...menu.categories];
    const idx = cats.findIndex(c => c.id === categoryId);
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (idx < 0 || targetIdx < 0 || targetIdx >= cats.length) {
      return;
    }

    [cats[idx], cats[targetIdx]] = [cats[targetIdx], cats[idx]];
    const previous = menu.categories;
    const ordered = cats.map(c => c.id);

    this.menu.update(m => (m ? { ...m, categories: cats } : null));

    this.menuService.reorderCategories(menu.id, ordered).subscribe({
        next: response => {
        if (response.success && response.data) {
          this.menu.update(m => (m ? { ...m, categories: response.data! } : null));
        }
      },
      error: () => {
        this.menu.update(m => (m ? { ...m, categories: previous } : null));
        this.loadMenu(menu.id);
      }
    });
  }

  protected moveItem(categoryId: string, itemId: string, direction: 'up' | 'down'): void {
    const state = this.categoryItemState()[categoryId];
    if (!state) {
      return;
    }

    const items = [...state.items];
    const idx = items.findIndex(i => i.id === itemId);
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (idx < 0 || targetIdx < 0 || targetIdx >= items.length) {
      return;
    }

    const a = items[idx];
    const b = items[targetIdx];

    this.menuService.updateItem(a.id, {
      displayOrder: b.displayOrder,
      imageFileId: null,
      clearImage: false
    }).subscribe({
      next: () => {
        this.menuService.updateItem(b.id, {
          displayOrder: a.displayOrder,
          imageFileId: null,
          clearImage: false
        }).subscribe({
          next: () => this.loadCategoryItems(categoryId, state.page),
          error: () => this.loadCategoryItems(categoryId, state.page)
        });
      },
      error: () => this.loadCategoryItems(categoryId, state.page)
    });
  }

  private updateItemInCategory(updated: MenuItemDto): void {
    this.categoryItemState.update(states => {
      for (const [cid, state] of Object.entries(states)) {
        if (state.items.some(i => i.id === updated.id)) {
          states[cid] = {
            ...state,
            items: state.items.map(i => (i.id === updated.id ? updated : i))
          };
          break;
        }
      }
      return states;
    });
  }

  private removeItemFromCategory(itemId: string): void {
    this.categoryItemState.update(states => {
      for (const [cid, state] of Object.entries(states)) {
        if (state.items.some(i => i.id === itemId)) {
          states[cid] = {
            ...state,
            items: state.items.filter(i => i.id !== itemId)
          };
          break;
        }
      }
      return states;
    });
  }

  private isCurrent(requestId: number, tenantId: string): boolean {
    return requestId === this.requestSequence &&
      this.tenantContext.activeTenantId() === tenantId;
  }

  protected formatPrice(value: number): string {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }
}
