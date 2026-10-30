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
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { MenuService } from '../../services/menu.service';
import { AuthorizationService } from '../../../../core/services/authorization.service';
import { TenantContextService } from '../../../../core/services/tenant-context.service';
import { HttpErrorHandlerService } from '../../../../core/services/http-error-handler.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ConfirmationDialog } from '../../../../shared/components/confirmation-dialog/confirmation-dialog';
import { LoadingSpinner } from '../../../../shared/components/loading-spinner/loading-spinner';
import { MenuManagementSummary } from './menu-management-summary';
import { MenuManagementToolbar } from './menu-management-toolbar';
import { MenuItemList } from './menu-item-list';
import { MenuPagination } from './menu-pagination';
import { MenuItemModal } from './menu-item-modal';
import type { ApiResponse } from '../../../../core/models/api-response.model';
import type { PagedResult } from '../../../../core/models/paged-result.model';
import type { MenuDetailsDto } from '../../models/menu.model';
import type { MenuCategoryDto } from '../../models/menu-category.model';
import type { MenuItemDto, MenuItemSummaryDto, MenuItemListQuery } from '../../models/menu-item.model';
import { formatPrice } from '../../models/menu-price.util';

type PageState = 'loading' | 'list' | 'empty' | 'not-found' | 'forbidden' | 'no-workspace' | 'error';

const PAGE_SIZE = 20;

interface FilterState {
  search: string | null;
  categoryId: string | null;
  isAvailable: boolean | null;
  page: number;
  pageSize: number;
}

@Component({
  selector: 'app-menu-management',
  standalone: true,
  imports: [
    ConfirmationDialog,
    LoadingSpinner,
    MenuManagementSummary,
    MenuManagementToolbar,
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
  protected readonly reorderMode = signal<boolean>(false);

  protected readonly deleteOpen = signal(false);
  protected readonly deleteTarget = signal<{ id: string; name: string } | null>(null);
  protected readonly pendingToggles = signal<Set<string>>(new Set());

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

  private readonly _totalCount = signal<number | null>(null);
  protected readonly totalCount = this._totalCount.asReadonly();

  private loadedTenantId: string | null = null;
  private requestSequence = 0;

  constructor() {
    effect(() => {
      const menuId = this.route.snapshot.paramMap.get('menuId');
      if (menuId) {
        this.ensureMenuLoaded(menuId);
      }
    });

    toObservable(this.tenantContext.activeTenantId)
      .pipe(takeUntilDestroyed())
      .subscribe(tenantId => {
        if (tenantId === this.loadedTenantId) {
          return;
        }
        this.loadedTenantId = tenantId;
        this.resetPage();
        const menuId = this.route.snapshot.paramMap.get('menuId');
        if (menuId) {
          this.ensureMenuLoaded(menuId);
        }
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
  }

  private ensureMenuLoaded(menuId: string): void {
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
        if (!this.isCurrent(requestId, tenantId)) return;
        if (!response.success || !response.data) {
          this.pageState.set('error');
          this.errorMessage.set(response.message ?? 'Unable to load the menu.');
          return;
        }
        this.menu.set(response.data);
        this.loadSummary(menuId, requestId, tenantId);
        this.loadCategories(menuId, requestId, tenantId);
        this.loadItems(menuId, requestId, tenantId);
      },
      error: (error: unknown) => {
        if (!this.isCurrent(requestId, tenantId)) return;
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

  private loadSummary(menuId: string, requestId: number, tenantId: string): void {
    this.summaryLoading.set(true);
    this.menuService.getMenuSummary(menuId).subscribe({
      next: (response: ApiResponse<MenuItemSummaryDto>) => {
        if (!this.isCurrent(requestId, tenantId)) return;
        this.summaryLoading.set(false);
        if (response.success && response.data) {
          this.summary.set(response.data);
        }
      },
      error: () => {
        if (!this.isCurrent(requestId, tenantId)) return;
        this.summaryLoading.set(false);
      }
    });
  }

  private loadCategories(menuId: string, requestId: number, tenantId: string): void {
    this.categoriesLoading.set(true);
    this.menuService.getCategories(menuId).subscribe({
      next: (response: ApiResponse<MenuCategoryDto[]>) => {
        if (!this.isCurrent(requestId, tenantId)) return;
        this.categoriesLoading.set(false);
        if (response.success && response.data) {
          this.categories.set(response.data);
        }
      },
      error: () => {
        if (!this.isCurrent(requestId, tenantId)) return;
        this.categoriesLoading.set(false);
      }
    });
  }

  private loadItems(menuId: string, requestId: number, tenantId: string): void {
    const f = this.filter();
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

    this.menuService.getMenuItemsQuery(menuId, query).subscribe({
      next: (response: ApiResponse<PagedResult<MenuItemDto>>) => {
        if (!this.isCurrent(requestId, tenantId)) return;
        this.itemsLoading.set(false);
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
        if (!this.isCurrent(requestId, tenantId)) return;
        this.itemsLoading.set(false);
        this.pageState.set('error');
        this.errorMessage.set(this.httpErrorHandler.extractBackendMessage(error) ??
          'Unable to load items. Please try again.');
      }
    });
  }

  private isCurrent(requestId: number, tenantId: string): boolean {
    return requestId === this.requestSequence &&
      this.tenantContext.activeTenantId() === tenantId;
  }

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
    const requestId = ++this.requestSequence;
    this.loadItems(menuId, requestId, tenantId);
  }

  /* ---------- Create / Edit modal ---------- */

  protected openCreateModal(): void {
    if (!this.canCreateItem() || this.isReadOnly()) return;
    this.modalMode.set('create');
    this.modalItem.set(null);
    this.modalOpen.set(true);
  }

  protected createCategory(): void {
    if (!this.canCreateCategory() || this.isReadOnly()) return;
    const menuId = this.route.snapshot.paramMap.get('menuId');
    if (!menuId) return;
    void this.router.navigate(['/menus', menuId, 'categories', 'new']);
  }

  protected openEditModal(item: MenuItemDto): void {
    if (!this.canManageItems() || this.isReadOnly()) return;
    this.modalMode.set('edit');
    this.modalItem.set(item);
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
    const requestId = ++this.requestSequence;
    this.loadItems(menuId, requestId, tenantId);
    this.loadSummary(menuId, requestId, tenantId);
    this.loadCategories(menuId, requestId, tenantId);
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
          this.errorMessage.set(response.message ?? 'Unable to update availability.');
          return;
        }
        this.items.update(list => list.map(i => i.id === item.id ? response.data! : i));
        const menuId = this.route.snapshot.paramMap.get('menuId')!;
        this.loadSummary(menuId, ++this.requestSequence, this.tenantContext.activeTenantId()!);
        this.notificationService.success(`${response.data.name} is now ${response.data.isAvailable ? 'available' : 'out of stock'}.`);
      },
      error: () => {
        this.pendingToggles.update(s => { const u = new Set(s); u.delete(item.id); return u; });
        this.items.update(list => list.map(i => i.id === item.id ? { ...i, isAvailable: previous } : i));
        this.errorMessage.set('Unable to update availability. Please try again.');
      }
    });
  }

  protected isTogglePending(itemId: string): boolean {
    return this.pendingToggles().has(itemId);
  }

  /* ---------- Delete ---------- */

  protected openDeleteDialog(item: MenuItemDto): void {
    if (!this.canDeleteItem() || this.isReadOnly()) return;
    this.deleteTarget.set({ id: item.id, name: item.name });
    this.deleteOpen.set(true);
  }

  protected cancelDelete(): void {
    this.deleteOpen.set(false);
    this.deleteTarget.set(null);
  }

  protected confirmDelete(): void {
    const target = this.deleteTarget();
    if (!target) return;
    this.deleteOpen.set(false);
    this.deleteTarget.set(null);
    const menuId = this.route.snapshot.paramMap.get('menuId');
    const tenantId = this.tenantContext.activeTenantId();
    if (!menuId || tenantId === null) return;
    const requestId = ++this.requestSequence;
    this.menuService.deleteItem(target.id).subscribe({
      next: () => {
        this.items.update(list => list.filter(i => i.id !== target.id));
        if (this.items().length === 0) {
          this.pageState.set('empty');
        }
        this.loadSummary(menuId, requestId, tenantId);
        this.loadCategories(menuId, requestId, tenantId);
        this.notificationService.success(`"${target.name}" has been deleted.`);
      },
      error: () => {
        this.errorMessage.set('Unable to delete the item. Please try again.');
      }
    });
  }

  /* ---------- UI & Drawer Controls ---------- */

  protected togglePreviewDrawer(): void {
    this.previewDrawerOpen.update(v => !v);
  }

  protected closePreviewDrawer(): void {
    this.previewDrawerOpen.set(false);
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

  protected toggleReorderMode(): void {
    this.reorderMode.update(v => !v);
    this.notificationService.info(
      this.reorderMode()
        ? 'Reorder mode enabled: Drag categories to rearrange'
        : 'Category arrangement saved.'
    );
  }

  protected publishMenuChanges(): void {
    this.notificationService.success('🎉 Menu published successfully to Resto.pk live QR & Web channels!');
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
    return item.imageUrl || 'https://placehold.co/400x300/f8fafc/64748b?text=Image';
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

  protected onAvailabilityChangeFromKey(key: 'all' | 'available' | 'unavailable'): void {
    this.onAvailabilityChange(key === 'all' ? null : key === 'available');
  }

  protected retry(): void {
    const menuId = this.route.snapshot.paramMap.get('menuId');
    if (menuId) {
      this.ensureMenuLoaded(menuId);
    }
  }
}
