import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal
} from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';
import { MenuService } from '../../services/menu.service';
import { resolveAssetUrl } from '../../../../core/utils/asset-url.util';
import { AuthorizationService } from '../../../../core/services/authorization.service';
import { TenantContextService } from '../../../../core/services/tenant-context.service';
import { HttpErrorHandlerService } from '../../../../core/services/http-error-handler.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ConfirmationDialog } from '../../../../shared/components/confirmation-dialog/confirmation-dialog';
import { LoadingSpinner } from '../../../../shared/components/loading-spinner/loading-spinner';
import { MenuManagementSummary } from './menu-management-summary';
import { MenuManagementToolbar } from './menu-management-toolbar';
import { MenuCategoryManager } from './menu-category-manager';
import { MenuItemList } from './menu-item-list';
import { MenuPagination } from './menu-pagination';
import { MenuItemModal } from './menu-item-modal';
import type { ApiResponse } from '../../../../core/models/api-response.model';
import type { PagedResult } from '../../../../core/models/paged-result.model';
import type { MenuDetailsDto, MenuDto } from '../../models/menu.model';
import type { MenuCategoryDto } from '../../models/menu-category.model';
import type { MenuItemDto, MenuItemSummaryDto, MenuItemListQuery } from '../../models/menu-item.model';
import { formatPrice } from '../../models/menu-price.util';

type PageState = 'loading' | 'list' | 'empty' | 'not-found' | 'forbidden' | 'no-workspace' | 'error';
type DeleteKind = 'item' | 'category';

const PAGE_SIZE = 20;

interface FilterState {
  search: string | null;
  categoryId: string | null;
  isAvailable: boolean | null;
  page: number;
  pageSize: number;
}

interface DeleteTarget {
  id: string;
  name: string;
}

@Component({
  selector: 'app-menu-management',
  standalone: true,
  imports: [
    ConfirmationDialog,
    LoadingSpinner,
    MenuManagementSummary,
    MenuManagementToolbar,
    MenuCategoryManager,
    MenuItemList,
    MenuPagination,
    MenuItemModal
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './menu-management.html',
  styleUrl: './menu-management.css'
})
export class MenuManagement {
  private readonly menuService = inject(MenuService);
  private readonly authorization = inject(AuthorizationService);
  private readonly tenantContext = inject(TenantContextService);
  private readonly httpErrorHandler = inject(HttpErrorHandlerService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly previewSearch = signal('');
  protected readonly selectedPreviewCategory = signal('all');
  protected readonly pageState = signal<PageState>('loading');
  protected readonly errorMessage = signal('');
  protected readonly menu = signal<MenuDetailsDto | null>(null);
  protected readonly summary = signal<MenuItemSummaryDto | null>(null);
  protected readonly categories = signal<MenuCategoryDto[]>([]);
  protected readonly items = signal<MenuItemDto[]>([]);

  protected readonly filter = signal<FilterState>({
    search: null,
    categoryId: null,
    isAvailable: null,
    page: 1,
    pageSize: PAGE_SIZE
  });

  protected readonly itemsLoading = signal(false);
  protected readonly summaryLoading = signal(false);
  protected readonly categoriesLoading = signal(false);

  protected readonly modalOpen = signal(false);
  protected readonly modalMode = signal<'create' | 'edit'>('create');
  protected readonly modalItem = signal<MenuItemDto | null>(null);

  protected readonly viewMode = signal<'grid' | 'list'>('grid');
  protected readonly previewDrawerOpen = signal<boolean>(false);
  protected readonly activeDiet = signal<string>('all');

  protected readonly deleteOpen = signal(false);
  protected readonly deleteTarget = signal<DeleteTarget | null>(null);
  protected readonly deleteKind = signal<DeleteKind | null>(null);
  protected readonly pendingToggles = signal<Set<string>>(new Set());
  protected readonly publishing = signal(false);

  protected readonly publishLabel = computed(() => {
    const menu = this.menu();
    if (!menu) return 'Publish Changes';
    return menu.status === 'Published' ? 'Unpublish' : 'Publish Changes';
  });

  protected readonly publishedUrl = signal<string | null>(null);
  protected readonly copyConfirmed = signal(false);
  protected readonly publishingUrl = signal(false);

  /* ---------- Category lifecycle state ---------- */

  protected readonly pendingCategoryIds = signal<Set<string>>(new Set());
  protected readonly categoryReordering = signal(false);
  protected readonly categoryError = signal<string | null>(null);

  protected readonly canViewItem = computed(() =>
    this.authorization.hasPermission('MenuItem.View')
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
  protected readonly canViewCategory = computed(() =>
    this.authorization.hasPermission('MenuCategory.View')
  );
  protected readonly canCreateCategory = computed(() =>
    this.authorization.hasPermission('MenuCategory.Create')
  );
  protected readonly canUpdateCategory = computed(() =>
    this.authorization.hasPermission('MenuCategory.Update')
  );
  protected readonly canDeleteCategory = computed(() =>
    this.authorization.hasPermission('MenuCategory.Delete')
  );

  protected readonly isArchived = computed(() => this.menu()?.status === 'Archived');
  protected readonly isReadOnly = computed(() => this.isArchived());

  protected readonly activeFilterCount = computed(() => {
    const f = this.filter();
    let count = 0;
    if (f.search) count++;
    if (f.categoryId) count++;
    if (f.isAvailable !== null) count++;
    return count;
  });

  protected readonly filteredCategory = computed(() => {
    const id = this.filter().categoryId;
    return id ? this.categories().find(c => c.id === id) ?? null : null;
  });

  protected readonly totalPages = computed(() => {
    const f = this.filter();
    return Math.max(1, Math.ceil((this.totalCount() ?? 0) / f.pageSize));
  });

  protected readonly deleteDialogTitle = computed(() =>
    this.deleteKind() === 'category' ? 'Delete category' : 'Delete item'
  );

  protected readonly deleteDialogMessage = computed(() => {
    const target = this.deleteTarget();
    if (!target) return '';

    return this.deleteKind() === 'category'
      ? `Delete the category "${target.name}"? Categories that still contain menu items cannot be deleted.`
      : `Are you sure you want to delete "${target.name}"?`;
  });

  private readonly _totalCount = signal<number | null>(null);
  protected readonly totalCount = this._totalCount.asReadonly();

  private loadedContextKey: string | null = null;
  private menuRequestSequence = 0;
  private summaryRequestSequence = 0;
  private categoryRequestSequence = 0;
  private itemRequestSequence = 0;

  constructor() {
    effect(() => {
      const menuId = this.route.snapshot.paramMap.get('menuId');
      const tenantId = this.tenantContext.activeTenantId();

      if (!menuId) {
        this.pageState.set('not-found');
        return;
      }

      if (tenantId === null) {
        this.pageState.set('no-workspace');
        return;
      }

      const contextKey = `${tenantId}:${menuId}`;
      if (contextKey === this.loadedContextKey) {
        return;
      }

      this.loadedContextKey = contextKey;
      this.resetPage();
      this.ensureMenuLoaded(menuId);
    });
  }

  private resetPage(): void {
    this.filter.set({
      search: null,
      categoryId: null,
      isAvailable: null,
      page: 1,
      pageSize: PAGE_SIZE
    });
    this._totalCount.set(null);
    this.items.set([]);
    this.summary.set(null);
    this.categories.set([]);
    this.menu.set(null);
    this.pageState.set('loading');
    this.errorMessage.set('');
    this.categoryError.set(null);
    this.deleteOpen.set(false);
    this.deleteTarget.set(null);
    this.deleteKind.set(null);
    this.pendingToggles.set(new Set());
    this.pendingCategoryIds.set(new Set());
    this.categoryReordering.set(false);

    this.menuRequestSequence++;
    this.summaryRequestSequence++;
    this.categoryRequestSequence++;
    this.itemRequestSequence++;
  }

  private ensureMenuLoaded(menuId: string): void {
    const tenantId = this.tenantContext.activeTenantId();
    if (tenantId === null) {
      this.pageState.set('no-workspace');
      return;
    }

    const requestId = ++this.menuRequestSequence;
    this.pageState.set('loading');
    this.errorMessage.set('');

    this.menuService.getMenu(menuId).subscribe({
      next: (response: ApiResponse<MenuDetailsDto>) => {
        if (!this.isCurrent(requestId, this.menuRequestSequence, tenantId)) return;
        if (!response.success || !response.data) {
          this.pageState.set('error');
          this.errorMessage.set(response.message ?? 'Unable to load the menu.');
          return;
        }
        this.menu.set(response.data);
        this.publishedUrl.set(
          response.data.status === 'Published' ? (response.data.publicUrl ?? null) : null
        );
        this.loadSummary(menuId, tenantId);
        this.loadCategories(menuId, tenantId);
        this.loadItems(menuId, tenantId);
      },
      error: (error: unknown) => {
        if (!this.isCurrent(requestId, this.menuRequestSequence, tenantId)) return;
        if (error instanceof HttpErrorResponse) {
          if (error.status === 404) { this.pageState.set('not-found'); return; }
          if (error.status === 403) { this.pageState.set('forbidden'); return; }
        }
        this.pageState.set('error');
        this.errorMessage.set(this.httpErrorHandler.extractBackendMessage(error) ??
          'Unable to load the menu. Please try again.');
      }
    });
  }

  private loadSummary(menuId: string, tenantId: string): void {
    const requestId = ++this.summaryRequestSequence;
    this.summaryLoading.set(true);

    this.menuService.getMenuSummary(menuId)
      .pipe(finalize(() => {
        if (this.isCurrent(requestId, this.summaryRequestSequence, tenantId)) {
          this.summaryLoading.set(false);
        }
      }))
      .subscribe({
        next: (response: ApiResponse<MenuItemSummaryDto>) => {
          if (!this.isCurrent(requestId, this.summaryRequestSequence, tenantId)) return;
          if (response.success && response.data) {
            this.summary.set(response.data);
          }
        },
        error: () => {}
      });
  }

  private loadCategories(menuId: string, tenantId: string): void {
    const requestId = ++this.categoryRequestSequence;
    this.categoriesLoading.set(true);
    this.categoryError.set(null);

    this.menuService.getCategories(menuId)
      .pipe(finalize(() => {
        if (this.isCurrent(requestId, this.categoryRequestSequence, tenantId)) {
          this.categoriesLoading.set(false);
        }
      }))
      .subscribe({
        next: (response: ApiResponse<MenuCategoryDto[]>) => {
          if (!this.isCurrent(requestId, this.categoryRequestSequence, tenantId)) return;

          if (!response.success || !response.data) {
            this.categoryError.set(response.message ?? 'Unable to load categories.');
            return;
          }

          this.categories.set(response.data);
          this.ensureSelectedCategoryExists(response.data);
        },
        error: (error: unknown) => {
          if (!this.isCurrent(requestId, this.categoryRequestSequence, tenantId)) return;
          this.categoryError.set(
            this.httpErrorHandler.extractBackendMessage(error) ??
              'Unable to load categories. Please try again.'
          );
        }
      });
  }

  private loadItems(menuId: string, tenantId: string): void {
    const f = this.filter();
    const requestId = ++this.itemRequestSequence;
    this.itemsLoading.set(true);
    const query: MenuItemListQuery = {
      page: f.page,
      pageSize: f.pageSize,
      search: f.search,
      categoryId: f.categoryId,
      isAvailable: f.isAvailable,
      sortBy: 'name',
      sortDirection: 'asc'
    };

    this.menuService.getMenuItemsQuery(menuId, query)
      .pipe(finalize(() => {
        if (this.isCurrent(requestId, this.itemRequestSequence, tenantId)) {
          this.itemsLoading.set(false);
        }
      }))
      .subscribe({
        next: (response: ApiResponse<PagedResult<MenuItemDto>>) => {
          if (!this.isCurrent(requestId, this.itemRequestSequence, tenantId)) return;
          if (!response.success || !response.data) {
            this.pageState.set('error');
            this.errorMessage.set(response.message ?? 'Unable to load items.');
            return;
          }
          const data = response.data;
          this.items.set(data.items ?? []);
          this._totalCount.set(data.totalCount ?? 0);
          this.pageState.set(this.items().length === 0 ? 'empty' : 'list');
        },
        error: (error: unknown) => {
          if (!this.isCurrent(requestId, this.itemRequestSequence, tenantId)) return;
          this.pageState.set('error');
          this.errorMessage.set(this.httpErrorHandler.extractBackendMessage(error) ??
            'Unable to load items. Please try again.');
        }
      });
  }

  private isCurrent(requestId: number, sequence: number, tenantId: string): boolean {
    return requestId === sequence &&
      this.tenantContext.activeTenantId() === tenantId;
  }

  private isSameContext(contextKey: string | null): boolean {
    return contextKey !== null && contextKey === this.loadedContextKey;
  }

  /* ---------- Filtering ---------- */

  protected onSearchChange(value: string): void {
    this.filter.update(f => ({ ...f, search: value || null, page: 1 }));
    this.refreshItems();
  }

  protected clearSearch(): void {
    this.filter.update(f => ({ ...f, search: null, page: 1 }));
    this.refreshItems();
  }

  protected onCategoryChange(categoryId: string | null): void {
    this.filter.update(f => ({ ...f, categoryId, page: 1 }));
    this.refreshItems();
  }

  protected onCategorySelectedFromManager(category: MenuCategoryDto): void {
    this.onCategoryChange(category.id);
  }

  protected onAvailabilityChange(isAvailable: boolean | null): void {
    this.filter.update(f => ({ ...f, isAvailable, page: 1 }));
    this.refreshItems();
  }

  protected onPageChange(page: number): void {
    this.filter.update(f => ({ ...f, page }));
    this.refreshItems();
  }

  protected clearFilters(): void {
    this.filter.set({
      search: null,
      categoryId: null,
      isAvailable: null,
      page: 1,
      pageSize: PAGE_SIZE
    });
    this.refreshItems();
  }

  private refreshItems(): void {
    const menuId = this.route.snapshot.paramMap.get('menuId');
    const tenantId = this.tenantContext.activeTenantId();
    if (!menuId || tenantId === null) return;
    this.loadItems(menuId, tenantId);
  }

  /* ---------- Create / Edit category ---------- */

  protected createCategory(): void {
    if (!this.canCreateCategory() || this.isReadOnly()) return;
    const menuId = this.route.snapshot.paramMap.get('menuId');
    if (!menuId) return;

    const queryParams: Record<string, string> = { returnTo: 'manage' };
    const restaurantId = this.menu()?.restaurantId ??
      this.route.snapshot.queryParamMap.get('restaurantId');
    if (restaurantId) {
      queryParams['restaurantId'] = restaurantId;
    }

    void this.router.navigate(['/menus', menuId, 'categories', 'new'], {
      queryParams
    });
  }

  protected editCategory(category: MenuCategoryDto): void {
    if (!this.canUpdateCategory() || this.isReadOnly()) return;
    const menuId = this.route.snapshot.paramMap.get('menuId');
    if (!menuId) return;

    const queryParams: Record<string, string> = { returnTo: 'manage' };
    const restaurantId = this.menu()?.restaurantId ??
      this.route.snapshot.queryParamMap.get('restaurantId');
    if (restaurantId) {
      queryParams['restaurantId'] = restaurantId;
    }

    this.categoryError.set(null);
    void this.router.navigate(
      ['/menus', menuId, 'categories', category.id, 'edit'],
      { queryParams }
    );
  }

  /* ---------- Category activation ---------- */

  protected toggleCategoryActive(category: MenuCategoryDto): void {
    if (!this.canUpdateCategory() || this.isReadOnly() ||
        this.pendingCategoryIds().has(category.id)) {
      return;
    }

    const nextActive = !category.isActive;
    const contextKey = this.loadedContextKey;
    this.addPendingCategory(category.id);
    this.categoryError.set(null);

    this.menuService.setCategoryActive(category.id, nextActive)
      .pipe(finalize(() => {
        if (this.isSameContext(contextKey)) {
          this.removePendingCategory(category.id);
        }
      }))
      .subscribe({
        next: (response: ApiResponse<MenuCategoryDto>) => {
          if (!this.isSameContext(contextKey)) return;
          if (!response.success || !response.data) {
            const message = response.message ?? 'Unable to update the category status.';
            this.categoryError.set(message);
            this.notificationService.error(message);
            return;
          }

          const updated = response.data;
          this.categories.update(list =>
            list.map(existing =>
              existing.id === updated.id ? { ...existing, ...updated } : existing
            )
          );

          if (this.filter().categoryId === updated.id && !updated.isActive) {
            this.onCategoryChange(this.fallbackCategoryId(this.categories()));
          }

          this.notificationService.success(
            `Category "${updated.name}" ${updated.isActive ? 'activated' : 'deactivated'}.`
          );
        },
        error: (error: unknown) => {
          if (!this.isSameContext(contextKey)) return;
          const message = this.httpErrorHandler.extractBackendMessage(error) ??
            'Unable to update the category status. Please try again.';
          this.categoryError.set(message);
          this.notificationService.error(message);
        }
      });
  }

  /* ---------- Category reordering ---------- */

  protected moveCategory(
    category: MenuCategoryDto,
    direction: 'up' | 'down'
  ): void {
    if (!this.canUpdateCategory() || this.isReadOnly() ||
        this.categoryReordering() ||
        this.pendingCategoryIds().has(category.id)) {
      return;
    }

    const current = this.categories();
    const index = current.findIndex(existing => existing.id === category.id);
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (index < 0 || targetIndex < 0 || targetIndex >= current.length) {
      return;
    }

    const menuId = this.route.snapshot.paramMap.get('menuId');
    if (!menuId) return;

    const contextKey = this.loadedContextKey;
    const previous = current;
    const reordered = [...current];
    [reordered[index], reordered[targetIndex]] = [
      reordered[targetIndex],
      reordered[index]
    ];

    this.categories.set(reordered);
    this.categoryReordering.set(true);
    this.categoryError.set(null);

    this.menuService
      .reorderCategories(menuId, reordered.map(existing => existing.id))
      .pipe(finalize(() => {
        if (this.isSameContext(contextKey)) {
          this.categoryReordering.set(false);
        }
      }))
      .subscribe({
        next: (response: ApiResponse<MenuCategoryDto[]>) => {
          if (!this.isSameContext(contextKey)) return;
          if (!response.success || !response.data) {
            this.categories.set(previous);
            const message = response.message ?? 'Unable to save the category order.';
            this.categoryError.set(message);
            this.notificationService.error(message);
            return;
          }

          this.categories.set(response.data);
          this.ensureSelectedCategoryExists(response.data);
          this.notificationService.success('Category order updated.');
        },
        error: (error: unknown) => {
          if (!this.isSameContext(contextKey)) return;
          this.categories.set(previous);
          const message = this.httpErrorHandler.extractBackendMessage(error) ??
            'Unable to save the category order. The previous order was restored.';
          this.categoryError.set(message);
          this.notificationService.error(message);
        }
      });
  }

  /* ---------- Category deletion ---------- */

  protected openDeleteCategoryDialog(category: MenuCategoryDto): void {
    if (!this.canDeleteCategory() || this.isReadOnly() ||
        this.pendingCategoryIds().has(category.id)) {
      return;
    }

    this.deleteKind.set('category');
    this.deleteTarget.set({ id: category.id, name: category.name });
    this.deleteOpen.set(true);
  }

  private deleteCategory(target: DeleteTarget): void {
    if (!this.canDeleteCategory() || this.isReadOnly() ||
        this.pendingCategoryIds().has(target.id)) {
      return;
    }

    const menuId = this.route.snapshot.paramMap.get('menuId');
    const tenantId = this.tenantContext.activeTenantId();
    const contextKey = this.loadedContextKey;
    this.addPendingCategory(target.id);
    this.categoryError.set(null);

    this.menuService.deleteCategory(target.id)
      .pipe(finalize(() => {
        if (this.isSameContext(contextKey)) {
          this.removePendingCategory(target.id);
        }
      }))
      .subscribe({
        next: () => {
          if (!this.isSameContext(contextKey)) return;
          const remaining = this.categories().filter(
            category => category.id !== target.id
          );
          this.categories.set(remaining);

          if (this.filter().categoryId === target.id) {
            this.onCategoryChange(this.fallbackCategoryId(remaining));
          }

          if (menuId && tenantId !== null) {
            this.loadSummary(menuId, tenantId);
          }

          this.notificationService.success(`"${target.name}" has been deleted.`);
        },
        error: (error: unknown) => {
          if (!this.isSameContext(contextKey)) return;
          const conflict = error instanceof HttpErrorResponse && error.status === 409;
          const message = conflict
            ? (this.httpErrorHandler.extractBackendMessage(error) ??
              'This category still contains menu items. Move or delete those items before deleting the category.')
            : (this.httpErrorHandler.extractBackendMessage(error) ??
              'Unable to delete the category. Please try again.');

          this.categoryError.set(message);
          this.notificationService.error(message);
        }
      });
  }

  private addPendingCategory(categoryId: string): void {
    this.pendingCategoryIds.update(pending => {
      const next = new Set(pending);
      next.add(categoryId);
      return next;
    });
  }

  private removePendingCategory(categoryId: string): void {
    this.pendingCategoryIds.update(pending => {
      const next = new Set(pending);
      next.delete(categoryId);
      return next;
    });
  }

  private fallbackCategoryId(categories: MenuCategoryDto[]): string | null {
    return categories.find(category => category.isActive)?.id ?? null;
  }

  private ensureSelectedCategoryExists(categories: MenuCategoryDto[]): void {
    const selectedId = this.filter().categoryId;
    if (!selectedId) return;
    if (categories.some(category => category.id === selectedId)) return;

    this.onCategoryChange(this.fallbackCategoryId(categories));
  }

  /* ---------- Item create / edit modal ---------- */

  protected openCreateModal(): void {
    if (!this.canCreateItem() || this.isReadOnly()) return;
    this.modalMode.set('create');
    this.modalItem.set(null);
    this.modalOpen.set(true);
  }

  protected openEditModal(item: MenuItemDto): void {
    if (!this.canManageItems() || this.isReadOnly()) return;
    this.modalMode.set('edit');
    this.modalItem.set({ ...item });
    this.modalOpen.set(true);
  }

  protected closeModal(): void {
    this.modalOpen.set(false);
    this.modalItem.set(null);
  }

  protected onItemSaved(): void {
    this.closeModal();
    const menuId = this.route.snapshot.paramMap.get('menuId');
    const tenantId = this.tenantContext.activeTenantId();
    if (!menuId || tenantId === null) return;

    this.loadItems(menuId, tenantId);
    this.loadSummary(menuId, tenantId);
    this.loadCategories(menuId, tenantId);
  }

  /* ---------- Availability toggle ---------- */

  protected toggleAvailability(item: MenuItemDto): void {
    if (!this.canManageItems() || this.isReadOnly() || this.pendingToggles().has(item.id)) return;
    const next = !item.isAvailable;
    const previous = item.isAvailable;
    this.pendingToggles.update(s => new Set(s).add(item.id));
    this.menuService.setItemAvailability(item.id, next).subscribe({
      next: response => {
        this.pendingToggles.update(s => { const u = new Set(s); u.delete(item.id); return u; });
        if (!response.success || !response.data) {
          this.items.update(list => list.map(i => i.id === item.id ? { ...i, isAvailable: previous } : i));
          const message = response.message ?? 'Unable to update availability.';
          this.errorMessage.set(message);
          this.notificationService.error(message);
          return;
        }
        this.items.update(list => list.map(i => i.id === item.id ? response.data! : i));
        const menuId = this.route.snapshot.paramMap.get('menuId');
        const tenantId = this.tenantContext.activeTenantId();
        if (menuId && tenantId !== null) {
          this.loadSummary(menuId, tenantId);
        }
        this.notificationService.success(`${response.data.name} is now ${response.data.isAvailable ? 'available' : 'out of stock'}.`);
      },
      error: (error: unknown) => {
        this.pendingToggles.update(s => { const u = new Set(s); u.delete(item.id); return u; });
        this.items.update(list => list.map(i => i.id === item.id ? { ...i, isAvailable: previous } : i));
        const message = this.httpErrorHandler.extractBackendMessage(error) ??
          'Unable to update availability. Please try again.';
        this.errorMessage.set(message);
        this.notificationService.error(message);
      }
    });
  }

  protected isTogglePending(itemId: string): boolean {
    return this.pendingToggles().has(itemId);
  }

  /* ---------- Item deletion ---------- */

  protected openDeleteDialog(item: MenuItemDto): void {
    if (!this.canDeleteItem() || this.isReadOnly()) return;
    this.deleteKind.set('item');
    this.deleteTarget.set({ id: item.id, name: item.name });
    this.deleteOpen.set(true);
  }

  protected cancelDelete(): void {
    this.closeDeleteDialog();
  }

  protected confirmDelete(): void {
    const target = this.deleteTarget();
    const kind = this.deleteKind();
    if (!target || !kind) return;

    this.closeDeleteDialog();

    if (kind === 'category') {
      this.deleteCategory(target);
    } else {
      this.deleteItem(target);
    }
  }

  private deleteItem(target: DeleteTarget): void {
    const menuId = this.route.snapshot.paramMap.get('menuId');
    const tenantId = this.tenantContext.activeTenantId();
    if (!menuId || tenantId === null) return;

    this.menuService.deleteItem(target.id).subscribe({
      next: () => {
        const remaining = this.items().filter(item => item.id !== target.id);

        if (remaining.length === 0 && this.filter().page > 1) {
          this.filter.update(f => ({ ...f, page: f.page - 1 }));
        }

        this.loadItems(menuId, tenantId);
        this.loadSummary(menuId, tenantId);
        this.loadCategories(menuId, tenantId);
        this.notificationService.success(`"${target.name}" has been deleted.`);
      },
      error: (error: unknown) => {
        const message = this.httpErrorHandler.extractBackendMessage(error) ??
          'Unable to delete the item. Please try again.';
        this.notificationService.error(message);
      }
    });
  }

  private closeDeleteDialog(): void {
    this.deleteOpen.set(false);
    this.deleteTarget.set(null);
    this.deleteKind.set(null);
  }

  /* ---------- UI & Drawer Controls ---------- */

  protected togglePreviewDrawer(): void {
    if (this.previewDrawerOpen()) {
      this.closePreviewDrawer();
      return;
    }

    this.previewSearch.set('');
    this.selectedPreviewCategory.set('all');
    this.previewDrawerOpen.set(true);
  }

  protected closePreviewDrawer(): void {
    this.previewDrawerOpen.set(false);
    this.previewSearch.set('');
    this.selectedPreviewCategory.set('all');
  }

  protected onPreviewSearchChange(value: string): void {
    this.previewSearch.set(value);
  }

 protected onPreviewCategoryChange(categoryId: string): void {
  this.selectedPreviewCategory.set(categoryId);
}
  protected clearPreviewFilters(): void {
    this.previewSearch.set('');
    this.selectedPreviewCategory.set('all');
  }

  protected onViewModeChange(mode: 'grid' | 'list'): void {
    this.viewMode.set(mode);
  }

  protected onDietChange(diet: string): void {
    this.activeDiet.set(diet);

    if (diet === 'all') {
      this.onSearchChange('');
    } else {
      this.onSearchChange(diet);
    }
  }

  protected publishMenuChanges(): void {
    const menu = this.menu();
    const menuId = this.route.snapshot.paramMap.get('menuId');
    if (!menu || !menuId || this.publishing() || this.isReadOnly()) return;

    if (menu.status === 'Archived') return;

    this.pageState.set('list');
    this.errorMessage.set('');
    this.publishing.set(true);
    const contextKey = this.loadedContextKey;

    const operation =
      menu.status === 'Published'
        ? this.menuService.unpublishMenu(menuId)
        : this.menuService.publishMenu(menuId);

    operation
      .pipe(finalize(() => {
        if (this.isSameContext(contextKey)) {
          this.publishing.set(false);
        }
      }))
      .subscribe({
        next: (response: ApiResponse<MenuDto>) => {
          if (!this.isSameContext(contextKey)) return;
          if (!response.success || !response.data) {
            const message =
              response.message ??
              'Unable to update the menu publication status.';
            this.errorMessage.set(message);
            this.notificationService.error(message);
            return;
          }

          const updated = response.data;
          const current = this.menu();
          if (current) {
            this.menu.set({
              ...current,
              status: updated.status,
              isActive: updated.isActive
            });
          }

          this.publishedUrl.set(
            updated.status === 'Published' ? (updated.publicUrl ?? null) : null
          );

          this.notificationService.success(
            updated.status === 'Published'
              ? 'Menu published successfully to Resto.pk live QR & Web channels!'
              : 'Menu unpublished successfully.'
          );

          const tenantId = this.tenantContext.activeTenantId();
          if (menuId && tenantId !== null) {
            this.loadSummary(menuId, tenantId);
          }
        },
        error: (error: unknown) => {
          if (!this.isSameContext(contextKey)) return;
          const message =
            this.httpErrorHandler.extractBackendMessage(error) ??
            'Unable to update the menu publication status. Please try again.';
          this.errorMessage.set(message);
          this.pageState.set('error');
          this.notificationService.error(message);
        }
      });
  }

  protected async copyPublicUrl(): Promise<void> {
    const url = this.publishedUrl();
    if (!url) return;
    this.publishingUrl.set(true);
    try {
      await navigator.clipboard.writeText(url);
      this.copyConfirmed.set(true);
      setTimeout(() => this.copyConfirmed.set(false), 2000);
    } finally {
      this.publishingUrl.set(false);
    }
  }

  protected openPublicUrl(): void {
    const url = this.publishedUrl();
    if (url) window.open(url, '_blank', 'noopener');
  }

  /* ---------- Helpers ---------- */

  protected trackByItemId(_index: number, item: MenuItemDto): string {
    return item.id;
  }

  protected trackByCategoryId(_index: number, category: MenuCategoryDto): string {
    return category.id;
  }

  protected formatMoney(value: number): string {
    return formatPrice(value);
  }

  protected availabilityLabel(item: MenuItemDto): string {
    return item.isAvailable ? 'Available' : 'Out of stock';
  }

  protected imageUrlFor(item: MenuItemDto): string {
    return resolveAssetUrl(item.imageUrl) || 'https://placehold.co/400x300/f8fafc/64748b?text=Image';
  }

  protected categoryNameFor(item: MenuItemDto): string {
    return item.categoryName || 'Uncategorized';
  }

  protected chipLabel(category: MenuCategoryDto): string {
    return `${category.name} (${category.itemCount})`;
  }

  protected availabilityLabelKey(): 'all' | 'available' | 'unavailable' {
    const v = this.filter().isAvailable;
    if (v === null) return 'all';
    return v ? 'available' : 'unavailable';
  }

  protected previewCategoryCountFor(category: MenuCategoryDto): number {
    return category.itemCount ?? 0;
  }

  protected previewImageUrlFor(item: MenuItemDto): string {
    return resolveAssetUrl(item.imageUrl) || 'https://placehold.co/400x300/f8fafc/64748b?text=Image';
  }

  protected previewPriceFor(item: MenuItemDto): string {
    return this.formatMoney(item.price);
  }

  protected previewAvailabilityLabel(item: MenuItemDto): string {
    return item.isAvailable ? 'Available' : 'Currently unavailable';
  }

  protected previewDescriptionFor(item: MenuItemDto): string {
    return item.description?.trim() || 'No description available.';
  }

  protected previewCategoryLabelFor(item: MenuItemDto): string {
    return item.categoryName || 'Uncategorized';
  }

  protected trackByPreviewItemId(_index: number, item: MenuItemDto): string {
    return item.id;
  }

  protected trackByPreviewCategoryId(_index: number, category: MenuCategoryDto): string {
    return category.id;
  }

  protected onAvailabilityChangeFromKey(key: 'all' | 'available' | 'unavailable'): void {
    this.onAvailabilityChange(key === 'all' ? null : key === 'available');
  }

  protected readonly previewCategories = computed(() =>
    this.categories().filter(category => category.isActive)
  );

 protected readonly filteredPreviewItems = computed(() => {
  const search = this.previewSearch().trim().toLowerCase();
  const selectedCategoryId = this.selectedPreviewCategory();

  return this.items().filter(item => {
    const matchesSearch =
      !search ||
      item.name.toLowerCase().includes(search) ||
      (item.description ?? '').toLowerCase().includes(search) ||
      (item.categoryName ?? '').toLowerCase().includes(search);

    const matchesCategory =
      selectedCategoryId === 'all' ||
      item.menuCategoryId === selectedCategoryId;

    return matchesSearch && matchesCategory;
  });
});

  protected readonly previewAvailableCount = computed(() =>
    this.filteredPreviewItems().filter(item => item.isAvailable).length
  );

  protected readonly previewUnavailableCount = computed(() =>
    this.filteredPreviewItems().filter(item => !item.isAvailable).length
  );

  protected readonly previewTotalCount = computed(() =>
    this.filteredPreviewItems().length
  );

  protected readonly previewCategoryCount = computed(() =>
    this.previewCategories().length
  );

  protected retry(): void {
    const menuId = this.route.snapshot.paramMap.get('menuId');
    if (menuId) {
      this.ensureMenuLoaded(menuId);
    }
  }
}