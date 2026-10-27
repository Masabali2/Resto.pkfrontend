import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { MenuService } from '../../services/menu.service';
import { AuthorizationService } from '../../../../core/services/authorization.service';
import { TenantContextService } from '../../../../core/services/tenant-context.service';
import { HttpErrorHandlerService } from '../../../../core/services/http-error-handler.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ConfirmationDialog } from '../../../../shared/components/confirmation-dialog/confirmation-dialog';
import { LoadingSpinner } from '../../../../shared/components/loading-spinner/loading-spinner';
import { BulkPriceDialog } from '../../components/bulk-price-dialog/bulk-price-dialog';
import type { ApiResponse } from '../../../../core/models/api-response.model';
import type { MenuDetailsDto } from '../../models/menu.model';
import type { MenuCategoryDto } from '../../models/menu-category.model';
import type { MenuItemDto } from '../../models/menu-item.model';
import { formatPrice } from '../../models/menu-price.util';

type PageState = 'loading' | 'list' | 'not-found' | 'no-workspace' | 'forbidden' | 'error';

interface CategoryItemState {
  items: MenuItemDto[];
  page: number;
  pageSize: number;
  totalCount: number;
  loading: boolean;
  error: string | null;
}

const ITEMS_PAGE_SIZE = 50;

@Component({
  selector: 'app-menu-detail',
  standalone: true,
  imports: [
    FormsModule,
    ConfirmationDialog,
    LoadingSpinner,
    BulkPriceDialog
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

  protected readonly activeCategoryId = signal<string | null>(null);
  protected readonly searchQuery = signal('');
  protected readonly isAddingCategory = signal(false);
  protected readonly newCategoryName = signal('');
  protected readonly addingCategory = signal(false);
  protected readonly bulkPriceOpen = signal(false);
  protected readonly pendingToggles = signal<Set<string>>(new Set());

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

  protected readonly isArchived = computed(() => this.menu()?.status === 'Archived');

  protected readonly isReadOnly = computed(() => this.isArchived());

  protected readonly categories = computed(
    () => this.menu()?.categories ?? []
  );

  protected readonly activeCategory = computed(() => {
    const categories = this.categories();
    const activeId = this.activeCategoryId();

    return categories.find(c => c.id === activeId) ?? categories[0] ?? null;
  });

  protected readonly orderedCategories = computed(() => {
    const active = this.activeCategory();

    if (!active) {
      return [];
    }

    return [active, ...this.categories().filter(c => c.id !== active.id)];
  });

  protected readonly activeItems = computed(
    () => this.categoryItems(this.activeCategory()?.id ?? '')
  );

  protected readonly activeItemsLoading = computed(() =>
    this.categoryItemsLoading(this.activeCategory()?.id ?? '')
  );

  protected readonly filteredItems = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const items = this.activeItems();

    if (query.length === 0) {
      return items;
    }

    return items.filter(
      item =>
        item.name.toLowerCase().includes(query) ||
        (item.description ?? '').toLowerCase().includes(query)
    );
  });

  protected readonly availableCount = computed(
    () => this.activeItems().filter(item => item.isAvailable).length
  );

  protected readonly outOfStockCount = computed(
    () => this.activeItems().length - this.availableCount()
  );

  private loadedTenantId: string | null = null;
  private requestSequence = 0;
  private suppressTenantReload = false;

  constructor() {
    toObservable(this.tenantContext.activeTenantId)
      .pipe(takeUntilDestroyed())
      .subscribe(tenantId => {
        if (tenantId === this.loadedTenantId || this.suppressTenantReload) {
          return;
        }

        this.loadedTenantId = tenantId;
        this.pageState.set('loading');
        this.errorMessage.set('');
        this.menu.set(null);
        this.categoryItemState.set({});
        this.activeCategoryId.set(null);
        this.searchQuery.set('');

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

        this.activeCategoryId.set(null);
        this.loadMenu(menuId);
      });

    effect(() => {
      const categoryId = this.activeCategoryId();

      if (!categoryId) {
        return;
      }

      const state = this.categoryItemState()[categoryId];

      if (!state && !this.categoryItemLoadingGuard(categoryId)) {
        queueMicrotask(() => {
          if (!this.categoryItemState()[categoryId]) {
            this.loadCategoryItems(categoryId, 1);
          }
        });
      }
    });
  }

  private categoryItemLoadingGuard(categoryId: string): boolean {
    return !!this.categoryItemState()[categoryId]?.loading;
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

    this.menuService.getMenu(menuId).subscribe({
      next: (response: ApiResponse<MenuDetailsDto>) => {
        if (!this.isCurrent(requestId, tenantId)) {
          return;
        }

        if (!response.success || !response.data) {
          this.errorMessage.set(response.message ?? 'Unable to load the menu.');
          this.pageState.set('error');
          return;
        }

        const menu = response.data;
        this.menu.set(menu);
        this.pageState.set('list');

        if (
          this.activeCategoryId() === null ||
          !menu.categories.some(category => category.id === this.activeCategoryId())
        ) {
          const preferred = menu.categories[1] ?? menu.categories[0];
          this.activeCategoryId.set(preferred?.id ?? null);
        }

        this.ensureActiveItemsLoaded();
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

  protected selectCategory(categoryId: string): void {
    if (this.activeCategoryId() === categoryId) {
      return;
    }

    this.activeCategoryId.set(categoryId);
    this.searchQuery.set('');
    this.ensureActiveItemsLoaded();
  }

  private ensureActiveItemsLoaded(): void {
    const category = this.activeCategory();

    if (!category) {
      return;
    }

    if (!this.categoryItemState()[category.id]) {
      this.loadCategoryItems(category.id, 1);
    }
  }

  protected onNewCategoryNameChange(value: string): void {
    this.newCategoryName.set(value);
  }

  protected startAddCategory(): void {
    if (!this.canCreateCategory() || this.isReadOnly()) {
      return;
    }

    this.isAddingCategory.set(true);
    this.newCategoryName.set('');
  }

  protected cancelAddCategory(): void {
    this.isAddingCategory.set(false);
    this.newCategoryName.set('');
  }

  protected submitAddCategory(): void {
    const menu = this.menu();
    const name = this.newCategoryName().trim();

    if (!menu || name.length === 0 || this.addingCategory()) {
      return;
    }

    this.addingCategory.set(true);

    this.menuService.createCategory(menu.id, {
      name,
      description: null,
      displayOrder: null
    }).subscribe({
      next: response => {
        this.addingCategory.set(false);

        if (!response.success || !response.data) {
          this.errorMessage.set(
            response.message ?? 'Unable to add the category. Please try again.'
          );
          return;
        }

        const created = response.data;

        this.menu.update(current =>
          current ? { ...current, categories: [...current.categories, created] } : null
        );

        this.activeCategoryId.set(created.id);
        this.isAddingCategory.set(false);
        this.newCategoryName.set('');
        this.notificationService.success(`Category "${created.name}" added.`);
      },
      error: error => {
        this.addingCategory.set(false);
        this.errorMessage.set(
          this.httpErrorHandler.extractBackendMessage(error) ??
            'Unable to add the category. Please try again.'
        );
      }
    });
  }

  protected moveCategory(index: number, direction: 'up' | 'down'): void {
    const menu = this.menu();

    if (!menu || !this.canManageCategories() || this.isReadOnly()) {
      return;
    }

    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (index < 0 || targetIndex < 0 || targetIndex >= menu.categories.length) {
      return;
    }

    const categories = [...menu.categories];
    [categories[index], categories[targetIndex]] = [
      categories[targetIndex],
      categories[index]
    ];

    const previous = menu.categories;
    const ordered = categories.map(category => category.id);

    this.menu.update(current =>
      current ? { ...current, categories } : null
    );

    this.menuService.reorderCategories(menu.id, ordered).subscribe({
      next: response => {
        if (response.success && response.data) {
          this.menu.update(current =>
            current ? { ...current, categories: response.data! } : null
          );
        }
      },
      error: () => {
        this.menu.update(current =>
          current ? { ...current, categories: previous } : null
        );
        this.errorMessage.set(
          'The category order could not be saved. The previous order was restored.'
        );
      }
    });
  }

  protected editCategory(category: MenuCategoryDto): void {
    const menu = this.menu();

    if (!menu || !this.canManageCategories()) {
      return;
    }

    void this.router.navigate(
      ['/menus', menu.id, 'categories', category.id, 'edit'],
      {
        queryParams: { restaurantId: menu.restaurantId },
        queryParamsHandling: 'merge'
      }
    );
  }

  protected toggleCategoryActive(category: MenuCategoryDto): void {
    if (!this.canManageCategories() || this.isReadOnly()) {
      return;
    }

    const isActive = !category.isActive;

    this.menuService.setCategoryActive(category.id, isActive).subscribe({
      next: response => {
        if (!response.success || !response.data) {
          this.errorMessage.set(response.message ?? 'Unable to update the category.');
          return;
        }

        const updated = response.data;

        this.menu.update(current => {
          if (!current) {
            return null;
          }

          return {
            ...current,
            categories: current.categories.map(existing =>
              existing.id === updated.id
                ? { ...existing, isActive: updated.isActive }
                : existing
            )
          };
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
    if (!this.canDeleteCategory() || this.isReadOnly()) {
      return;
    }

    this.dialogKind.set('category');
    this.dialogTarget.set({ id: category.id, name: category.name });
    this.dialogOpen.set(true);
  }

  private deleteCategory(): void {
    const target = this.dialogTarget();

    if (!target || this.dialogKind() !== 'category') {
      return;
    }

    this.closeDialog();

    this.menuService.deleteCategory(target.id).subscribe({
      next: () => {
        this.menu.update(current => {
          if (!current) {
            return null;
          }

          return {
            ...current,
            categories: current.categories.filter(category => category.id !== target.id)
          };
        });

        this.categoryItemState.update(states => {
          const { [target.id]: removed, ...remaining } = states;
          return remaining;
        });

        if (this.activeCategoryId() === target.id) {
          this.activeCategoryId.set(null);
          this.ensureActiveItemsLoaded();
        }

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

  protected loadCategoryItems(categoryId: string, page = 1): void {
    const current = this.categoryItemState();
    const existing = current[categoryId];

    if (existing?.loading || !this.menu()) {
      return;
    }

    const emptyState: CategoryItemState = {
      items: [],
      page: 1,
      pageSize: ITEMS_PAGE_SIZE,
      totalCount: 0,
      loading: false,
      error: null
    };

    this.categoryItemState.update(states => ({
      ...states,
      [categoryId]: { ...(existing ?? emptyState), loading: true, error: null }
    }));

    this.menuService
      .getCategoryItems(categoryId, page, ITEMS_PAGE_SIZE)
      .subscribe({
        next: response => {
          if (!response.success || !response.data) {
            this.categoryItemState.update(states => ({
              ...states,
              [categoryId]: {
                ...(states[categoryId] ?? emptyState),
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
              pageSize: data.pageSize ?? ITEMS_PAGE_SIZE,
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
              ...(states[categoryId] ?? emptyState),
              loading: false,
              error:
                this.httpErrorHandler.extractBackendMessage(error) ??
                'Unable to load items.'
            }
          }));
        }
      });
  }

  protected categoryItems(categoryId: string): MenuItemDto[] {
    return this.categoryItemState()[categoryId]?.items ?? [];
  }

  protected categoryPage(
    categoryId: string
  ): { page: number; pageSize: number; totalCount: number } | null {
    const state = this.categoryItemState()[categoryId];

    if (!state) {
      return null;
    }

    return {
      page: state.page,
      pageSize: state.pageSize,
      totalCount: state.totalCount
    };
  }

  protected totalPages(categoryId: string): number {
    const page = this.categoryPage(categoryId);

    if (!page) {
      return 1;
    }

    return Math.max(1, Math.ceil(page.totalCount / page.pageSize));
  }

  protected categoryError(categoryId: string): string | null {
    return this.categoryItemState()[categoryId]?.error ?? null;
  }

  protected categoryItemsLoading(categoryId: string): boolean {
    return !!this.categoryItemState()[categoryId]?.loading;
  }

  protected isTogglePending(itemId: string): boolean {
    return this.pendingToggles().has(itemId);
  }

  protected toggleItemAvailability(item: MenuItemDto): void {
    if (!this.canManageItems() || this.isReadOnly() || this.isTogglePending(item.id)) {
      return;
    }

    const nextState = !item.isAvailable;
    const previous = item.isAvailable;

    this.applyAvailabilityLocally(item.id, nextState);
    this.pendingToggles.update(pending => new Set(pending).add(item.id));

    this.menuService.setItemAvailability(item.id, nextState).subscribe({
      next: response => {
        this.pendingToggles.update(pending => {
          const updated = new Set(pending);
          updated.delete(item.id);
          return updated;
        });

        if (!response.success || !response.data) {
          this.applyAvailabilityLocally(item.id, previous);
          this.errorMessage.set(response.message ?? 'Unable to update availability.');
          return;
        }

        this.updateItemInCategory(response.data);
        this.notificationService.success(
          `${response.data.name} is now ${
            response.data.isAvailable
              ? 'available on the digital menu'
              : 'marked out of stock'
          }.`
        );
      },
      error: error => {
        this.pendingToggles.update(pending => {
          const updated = new Set(pending);
          updated.delete(item.id);
          return updated;
        });

        this.applyAvailabilityLocally(item.id, previous);
        this.errorMessage.set(
          this.httpErrorHandler.extractBackendMessage(error) ??
            'Unable to update availability. Please try again.'
        );
      }
    });
  }

  private applyAvailabilityLocally(itemId: string, isAvailable: boolean): void {
    this.categoryItemState.update(states => {
      const updated = { ...states };

      for (const [categoryId, state] of Object.entries(updated)) {
        if (state.items.some(item => item.id === itemId)) {
          updated[categoryId] = {
            ...state,
            items: state.items.map(item =>
              item.id === itemId ? { ...item, isAvailable } : item
            )
          };
          break;
        }
      }

      return updated;
    });
  }

  protected toggleItemActive(item: MenuItemDto): void {
    if (!this.canManageItems() || this.isReadOnly()) {
      return;
    }

    this.menuService.setItemActive(item.id, !item.isActive).subscribe({
      next: response => {
        if (!response.success || !response.data) {
          this.errorMessage.set(response.message ?? 'Unable to update the item.');
          return;
        }

        this.updateItemInCategory(response.data);
        this.notificationService.success(
          `Item "${response.data.name}" ${response.data.isActive ? 'shown' : 'hidden'} on the menu.`
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

  protected createItem(): void {
    const menu = this.menu();
    const category = this.activeCategory();

    if (!menu || !category || !this.canCreateItem() || this.isReadOnly()) {
      return;
    }

    void this.router.navigate(
      ['/menus', menu.id, 'categories', category.id, 'items', 'new'],
      {
        queryParams: { restaurantId: menu.restaurantId },
        queryParamsHandling: 'merge'
      }
    );
  }

  protected editItem(item: MenuItemDto): void {
    const menu = this.menu();

    if (!menu || !this.canManageItems()) {
      return;
    }

    void this.router.navigate(
      [
        '/menus',
        menu.id,
        'categories',
        item.menuCategoryId,
        'items',
        item.id,
        'edit'
      ],
      {
        queryParams: { restaurantId: menu.restaurantId },
        queryParamsHandling: 'merge'
      }
    );
  }

  protected openDeleteItemDialog(item: MenuItemDto): void {
    if (!this.canDeleteItem() || this.isReadOnly()) {
      return;
    }

    this.dialogKind.set('item');
    this.dialogTarget.set({ id: item.id, name: item.name });
    this.dialogOpen.set(true);
  }

  private deleteItem(): void {
    const target = this.dialogTarget();

    if (!target || this.dialogKind() !== 'item') {
      return;
    }

    this.closeDialog();

    let categoryId = '';

    for (const [currentCategoryId, state] of Object.entries(this.categoryItemState())) {
      if (state.items.some(item => item.id === target.id)) {
        categoryId = currentCategoryId;
        break;
      }
    }

    this.menuService.deleteItem(target.id).subscribe({
      next: response => {
        if (!response.success) {
          this.errorMessage.set(
            response.message ?? 'Unable to delete the item. Please try again.'
          );
          return;
        }

        this.removeItemFromCategory(target.id);

        if (categoryId) {
          this.loadCategoryItems(
            categoryId,
            this.categoryItemState()[categoryId]?.page ?? 1
          );
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

  protected moveItem(index: number, direction: 'up' | 'down'): void {
    const category = this.activeCategory();

    if (!category || !this.canManageItems() || this.isReadOnly()) {
      return;
    }

    const state = this.categoryItemState()[category.id];

    if (!state) {
      return;
    }

    const items = state.items;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (index < 0 || targetIndex < 0 || targetIndex >= items.length) {
      return;
    }

    const currentItem = items[index];
    const targetItem = items[targetIndex];

    forkJoin([
      this.menuService.updateItem(currentItem.id, {
        displayOrder: targetItem.displayOrder,
        imageFileId: null,
        clearImage: false
      }),
      this.menuService.updateItem(targetItem.id, {
        displayOrder: currentItem.displayOrder,
        imageFileId: null,
        clearImage: false
      })
    ]).subscribe({
      next: () => this.loadCategoryItems(category.id, state.page),
      error: () => {
        this.loadCategoryItems(category.id, state.page);
        this.errorMessage.set(
          'The item order could not be saved. The original order was kept.'
        );
      }
    });
  }

  private updateItemInCategory(updated: MenuItemDto): void {
    this.categoryItemState.update(states => {
      const next = { ...states };

      for (const [categoryId, state] of Object.entries(next)) {
        if (state.items.some(item => item.id === updated.id)) {
          next[categoryId] = {
            ...state,
            items: state.items.map(item =>
              item.id === updated.id ? updated : item
            )
          };
          break;
        }
      }

      return next;
    });
  }

  private removeItemFromCategory(itemId: string): void {
    this.categoryItemState.update(states => {
      const next = { ...states };

      for (const [categoryId, state] of Object.entries(next)) {
        if (state.items.some(item => item.id === itemId)) {
          next[categoryId] = {
            ...state,
            items: state.items.filter(item => item.id !== itemId)
          };
          break;
        }
      }

      return next;
    });
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

        const updated = response.data;

        this.menu.update(current =>
          current ? { ...current, isActive: updated.isActive } : null
        );

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

  protected openBulkPriceDialog(): void {
    if (!this.canManageItems() || this.isReadOnly()) {
      return;
    }

    this.bulkPriceOpen.set(true);
  }

  protected closeBulkPriceDialog(): void {
    this.bulkPriceOpen.set(false);
  }

  protected onBulkPricesApplied(): void {
    const category = this.activeCategory();

    if (category) {
      this.loadCategoryItems(
        category.id,
        this.categoryItemState()[category.id]?.page ?? 1
      );
    }

    this.notificationService.success('Bulk price adjustment applied.');
  }

  protected cancelDialog(): void {
    this.closeDialog();
  }

  protected confirmDialog(): void {
    if (this.dialogKind() === 'category') {
      this.deleteCategory();
    } else if (this.dialogKind() === 'item') {
      this.deleteItem();
    } else {
      this.closeDialog();
    }
  }

  protected dialogConfirmMessage(): string {
    const target = this.dialogTarget();

    return target ? `Are you sure you want to delete "${target.name}"?` : '';
  }

  private closeDialog(): void {
    this.dialogOpen.set(false);
    this.dialogKind.set(null);
    this.dialogTarget.set(null);
  }

  protected clearSearch(): void {
    this.searchQuery.set('');
  }

  protected onSearchChange(value: string): void {
    this.searchQuery.set(value);
  }

  protected isFirstCategory(index: number): boolean {
    return index === 0;
  }

  protected isLastCategory(index: number): boolean {
    return index === this.categories().length - 1;
  }

  protected isFirstItem(index: number): boolean {
    return index === 0;
  }

  protected isLastItem(index: number): boolean {
    return index === this.activeItems().length - 1;
  }

  protected trackByCategoryId(_index: number, category: MenuCategoryDto): string {
    return category.id;
  }

  protected trackByItemId(_index: number, item: MenuItemDto): string {
    return item.id;
  }

  protected pluralize(count: number, singular: string): string {
    return `${count} ${count === 1 ? singular : singular + 's'}`;
  }

  protected formatMoney(value: number): string {
    return formatPrice(value);
  }

  private isCurrent(requestId: number, tenantId: string): boolean {
    return (
      requestId === this.requestSequence &&
      this.tenantContext.activeTenantId() === tenantId
    );
  }

  public setTenantReloadSuppressedForTests(suppress: boolean): void {
    this.suppressTenantReload = suppress;
  }
}