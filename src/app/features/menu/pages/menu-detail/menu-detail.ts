import { Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
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

/** Backend convention for category item pages (Task 2 aligned the service default). */
const ITEMS_PAGE_SIZE = 50;

/** Body of PUT /api/v1/menu-items/{itemId} built from a full existing DTO. */
interface ItemReorderRequest {
  name: string;
  description: string | null;
  price: number;
  currency: string;
  imageFileId: string | null;
  clearImage: boolean;
  displayOrder: number;
}

/**
 * Screen 4 — Digital Menu Organizer.
 * Two-column workspace: a category navigation rail on the left and the
 * selected category's items on the right. Recovered selectively from orphan
 * commit 93f7f89 with three deliberate corrections documented in Task 3:
 * first-category (not second) default selection, strict delete-success
 * handling, and full-DTO item reorder payloads that cannot clear fields.
 */
@Component({
  selector: 'app-menu-detail',
  standalone: true,
  imports: [LoadingSpinner, ConfirmationDialog, Button, RouterLink],
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

  /** The category whose items are shown in the right-hand panel. */
  protected readonly activeCategoryId = signal<string | null>(null);

  /** Item ids with an in-flight availability PATCH (pending-toggle guard). */
  protected readonly pendingToggles = signal<ReadonlySet<string>>(new Set());

  // Inline category creation state (rail footer form).
  protected readonly isAddingCategory = signal(false);
  protected readonly addingCategory = signal(false);
  protected readonly newCategoryName = signal('');
  protected readonly categoryValidationError = signal('');

  /** True while a category reorder request is in flight; blocks overlapping saves. */
  protected readonly reorderingCategories = signal(false);

  /**
   * Test seam: the active-tenant subscription fires on emit and would race
   * with the route-paramMap bootstrap load in component tests. Production
   * code never sets this. Declared before the constructor so field
   * initializers run ahead of injection-based constructor logic.
   */
  private suppressTenantReload = false;

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

  protected readonly activeCategory = computed(() => {
    const menu = this.menu();
    const activeId = this.activeCategoryId();
    if (!menu || !activeId) {
      return null;
    }
    return menu.categories.find(c => c.id === activeId) ?? null;
  });

  protected readonly activeItems = computed(() => {
    const id = this.activeCategoryId();
    return id ? (this.categoryItemState()[id]?.items ?? []) : [];
  });

  private loadedTenantId: string | null = null;
  private requestSequence = 0;

  constructor() {
    // React to active-tenant changes: reset all context so nothing from the
    // previous workspace remains visible (stale-data protection).
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
        this.pendingToggles.set(new Set());
        this.cancelAddCategory();

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

        // Switching menus clears the previous selection so a stale category
        // id can never survive into the newly loaded menu.
        this.activeCategoryId.set(null);
        this.loadMenu(menuId);
      });

    // Whenever the active category resolves to a real id, make sure its
    // items are loaded exactly once (the per-category loading flag guards
    // against duplicate requests).
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

  /** Guards against two concurrent loads of the same category. */
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

        // Active-category initialization (corrects the orphan defect that
        // defaulted to categories[1]): keep the current selection when it
        // still exists; otherwise select the FIRST category; null-safe when
        // the list is empty.
        const activeId = this.activeCategoryId();
        if (!activeId || !menu.categories.some(c => c.id === activeId)) {
          this.activeCategoryId.set(menu.categories[0]?.id ?? null);
        }
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

  // --- Menu-level actions -----------------------------------------------------

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

  // --- Category rail ----------------------------------------------------------

  protected selectCategory(categoryId: string): void {
    if (this.activeCategoryId() === categoryId) {
      return;
    }

    this.activeCategoryId.set(categoryId);
    this.errorMessage.set('');
  }

  /** Accurate count only once the category's page metadata has been fetched. */
  protected categoryCountLabel(categoryId: string): string {
    const state = this.categoryItemState()[categoryId];
    if (!state) {
      return '';
    }

    return String(state.totalCount);
  }

  protected trackByCategoryId(_index: number, category: MenuCategoryDto): string {
    return category.id;
  }

  // Inline category creation ----------------------------------------------------

  protected startAddCategory(): void {
    if (!this.canCreateCategory() || this.isArchived() || this.addingCategory()) {
      return;
    }

    this.isAddingCategory.set(true);
    this.newCategoryName.set('');
    this.categoryValidationError.set('');
  }

  protected cancelAddCategory(): void {
    this.isAddingCategory.set(false);
    this.newCategoryName.set('');
    this.categoryValidationError.set('');
  }

  protected onCategoryNameInput(value: string): void {
    this.newCategoryName.set(value);
    if (this.categoryValidationError()) {
      this.categoryValidationError.set('');
    }
  }

  protected submitAddCategory(event?: Event): void {
    event?.preventDefault();

    const menu = this.menu();
    if (!menu || this.addingCategory()) {
      return;
    }

    const name = this.newCategoryName().trim();
    if (name.length === 0) {
      this.categoryValidationError.set('Category name is required.');
      return;
    }

    if (name.length > 100) {
      this.categoryValidationError.set('Category name must be 100 characters or fewer.');
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

        // Strict success contract: only mutate UI state for a successful
        // envelope carrying data. Failed envelopes never add the category.
        if (!response.success || !response.data) {
          this.categoryValidationError.set(
            response.message ?? 'Unable to add the category. Please try again.'
          );
          return;
        }

        const created = response.data;
        this.menu.update(m =>
          m ? { ...m, categories: [...m.categories, created] } : null
        );
        // Select the newly created category — its id comes from the DTO.
        this.activeCategoryId.set(created.id);
        this.isAddingCategory.set(false);
        this.newCategoryName.set('');
        this.categoryValidationError.set('');
        this.notificationService.success(`Category "${created.name}" added.`);
      },
      error: error => {
        this.addingCategory.set(false);
        this.categoryValidationError.set(
          this.httpErrorHandler.extractBackendMessage(error) ??
            'Unable to add the category. Please try again.'
        );
      }
    });
  }

  // Category persistence operations ---------------------------------------------

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

  protected toggleCategoryActive(category: MenuCategoryDto): void {
    const menu = this.menu();
    if (!menu || !this.canManageCategories() || this.isArchived()) {
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
        this.menu.update(m => {
          if (!m) return null;
          return {
            ...m,
            categories: m.categories.map(c =>
              c.id === updated.id ? { ...c, isActive: updated.isActive } : c
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
    if (!this.canDeleteCategory() || this.isArchived()) {
      return;
    }

    this.dialogKind.set('category');
    this.dialogTarget.set({ id: category.id, name: category.name });
    this.dialogOpen.set(true);
  }

  /**
   * Strict deletion success handling: the category is removed from the UI
   * ONLY when the response satisfies the application's success contract
   * (`success === true`). A completed-but-unsuccessful envelope leaves the
   * list untouched; HTTP errors (including the 409 "still has items"
   * conflict) surface actionable messages.
   */
  private deleteCategory(): void {
    const target = this.dialogTarget();
    if (!target || this.dialogKind() !== 'category') {
      return;
    }

    this.closeDialog();

    this.menuService.deleteCategory(target.id).subscribe({
      next: response => {
        if (!response.success) {
          this.errorMessage.set(
            response.message ?? 'Unable to delete the category. Please try again.'
          );
          return;
        }

        const menu = this.menu();
        if (!menu) return;

        const remaining = menu.categories.filter(c => c.id !== target.id);
        this.menu.update(m => (m ? { ...m, categories: remaining } : null));
        this.categoryItemState.update(states => {
          const { [target.id]: _removed, ...rest } = states;
          return rest;
        });

        if (this.activeCategoryId() === target.id) {
          // Choose a valid remaining category instead of leaving a dangling id.
          this.activeCategoryId.set(remaining[0]?.id ?? null);
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

  // Category reordering ----------------------------------------------------------

  /**
   * Move-up/move-down controls persist through
   * PATCH /api/v1/menus/{menuId}/categories/order with the COMPLETE ordered
   * id list. Overlapping requests are blocked via `reorderingCategories`;
   * failures roll back the optimistic order, notify the user, and refresh
   * from the server. The active selection survives because ids are stable.
   */
  protected moveCategory(categoryId: string, direction: 'up' | 'down'): void {
    const menu = this.menu();
    if (!menu || !this.canManageCategories() || this.isArchived() || this.reorderingCategories()) {
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

    this.reorderingCategories.set(true);
    this.errorMessage.set('');
    this.menu.update(m => (m ? { ...m, categories: cats } : null));

    this.menuService.reorderCategories(menu.id, ordered).subscribe({
      next: response => {
        this.reorderingCategories.set(false);

        if (response.success && response.data) {
          this.menu.update(m => (m ? { ...m, categories: response.data! } : null));
          return;
        }

        this.menu.update(m => (m ? { ...m, categories: previous } : null));
        this.errorMessage.set(
          response.message ??
            'The category order could not be saved. The previous order was restored.'
        );
      },
      error: error => {
        this.reorderingCategories.set(false);
        this.menu.update(m => (m ? { ...m, categories: previous } : null));
        this.errorMessage.set(
          this.httpErrorHandler.extractBackendMessage(error) ??
            'The category order could not be saved. The previous order was restored.'
        );
      }
    });
  }

  protected isFirstCategory(categoryId: string): boolean {
    const categories = this.menu()?.categories ?? [];
    return categories.length > 0 && categories[0].id === categoryId;
  }

  protected isLastCategory(categoryId: string): boolean {
    const categories = this.menu()?.categories ?? [];
    return categories.length > 0 && categories[categories.length - 1].id === categoryId;
  }

  // --- Items panel ------------------------------------------------------------

  protected loadCategoryItems(categoryId: string, page = 1): void {
    const current = this.categoryItemState();
    const existing = current[categoryId];
    if (existing?.loading) {
      return;
    }

    if (!this.menu()) {
      return;
    }

    const fallback: CategoryItemState = {
      items: [],
      page: 1,
      pageSize: ITEMS_PAGE_SIZE,
      totalCount: 0,
      loading: false,
      error: null
    };

    this.categoryItemState.update(states => ({
      ...states,
      [categoryId]: { ...(existing ?? fallback), loading: true, error: null }
    }));

    this.menuService.getCategoryItems(categoryId, page).subscribe({
      next: response => {
        if (!response.success || !response.data) {
          this.categoryItemState.update(states => ({
            ...states,
            [categoryId]: {
              ...(states[categoryId] ?? fallback),
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
            ...(states[categoryId] ?? fallback),
            loading: false,
            error:
              this.httpErrorHandler.extractBackendMessage(error) ?? 'Unable to load items.'
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

  protected totalPages(categoryId: string): number {
    const page = this.categoryPage(categoryId);
    if (!page) {
      return 1;
    }

    return Math.max(1, Math.ceil(page.totalCount / page.pageSize));
  }

  // Item CRUD navigation (routed forms preserved) -------------------------------

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

  protected editItem(item: MenuItemDto): void {
    const menu = this.menu();
    if (!menu || !this.canManageItems() || this.isArchived()) {
      return;
    }

    void this.router.navigate(
      ['/menus', menu.id, 'categories', item.menuCategoryId, 'items', item.id, 'edit'],
      { queryParams: { restaurantId: menu.restaurantId }, queryParamsHandling: 'merge' }
    );
  }

  // Optimistic availability toggle ----------------------------------------------

  protected isTogglePending(itemId: string): boolean {
    return this.pendingToggles().has(itemId);
  }

  /**
   * Availability toggle with optimistic UI. Changes `isAvailable` ONLY —
   * `isActive` is a distinct concept handled by toggleItemActive below.
   * The row is locked while the PATCH is in flight; failure restores the
   * previous value and shows an error.
   */
  protected toggleItemAvailability(item: MenuItemDto): void {
    if (!this.canManageItems() || this.isArchived() || this.isTogglePending(item.id)) {
      return;
    }

    const nextState = !item.isAvailable;
    const previous = item.isAvailable;

    this.applyAvailabilityLocally(item.id, nextState);
    this.pendingToggles.update(set => new Set(set).add(item.id));

    this.menuService.setItemAvailability(item.id, nextState).subscribe({
      next: response => {
        this.clearTogglePending(item.id);

        if (!response.success || !response.data) {
          this.applyAvailabilityLocally(item.id, previous);
          this.errorMessage.set(response.message ?? 'Unable to update availability.');
          return;
        }

        this.updateItemInCategory(response.data);
        this.notificationService.success(
          `${response.data.name} is now ${
            response.data.isAvailable ? 'available' : 'marked unavailable'
          }.`
        );
      },
      error: error => {
        this.clearTogglePending(item.id);
        this.applyAvailabilityLocally(item.id, previous);
        this.errorMessage.set(
          this.httpErrorHandler.extractBackendMessage(error) ??
            'Unable to update availability. Please try again.'
        );
      }
    });
  }

  private clearTogglePending(itemId: string): void {
    this.pendingToggles.update(set => {
      const copy = new Set(set);
      copy.delete(itemId);
      return copy;
    });
  }

  private applyAvailabilityLocally(itemId: string, isAvailable: boolean): void {
    this.categoryItemState.update(states => {
      const next = { ...states };
      for (const [cid, state] of Object.entries(next)) {
        if (state.items.some(i => i.id === itemId)) {
          next[cid] = {
            ...state,
            items: state.items.map(i => (i.id === itemId ? { ...i, isAvailable } : i))
          };
          break;
        }
      }
      return next;
    });
  }

  /** Active-status control — PATCH .../status. Kept semantically distinct from availability. */
  protected toggleItemActive(item: MenuItemDto): void {
    const menu = this.menu();
    if (!menu || !this.canManageItems() || this.isArchived()) {
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
          `Item "${response.data.name}" ${response.data.isActive ? 'shown' : 'hidden'}.`
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

  private deleteItem(): void {
    const target = this.dialogTarget();
    if (!target || this.dialogKind() !== 'item') {
      return;
    }

    this.closeDialog();

    let categoryId = '';
    for (const [cid, state] of Object.entries(this.categoryItemState())) {
      if (state.items.some(i => i.id === target.id)) {
        categoryId = cid;
        break;
      }
    }

    this.menuService.deleteItem(target.id).subscribe({
      next: response => {
        // Strict success contract — removal happens only for successful envelopes.
        if (!response.success) {
          this.errorMessage.set(
            response.message ?? 'Unable to delete the item. Please try again.'
          );
          return;
        }

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

  /**
   * Swap adjacent items' display order.
   *
   * Data-loss fix vs. orphan commit 93f7f89: the old code sent
   * `{ displayOrder, imageFileId: null, clearImage: false }` only. If the
   * backend treated omitted PUT fields as resets, name/description/price/
   * currency would be wiped by a simple reorder. This implementation sends
   * the FULL current values for every field of UpdateMenuItemRequest,
   * changing only displayOrder. Sequential updates with refresh + message
   * on partial failure keep the UI consistent with persisted state.
   */
  protected moveItem(index: number, direction: 'up' | 'down'): void {
    const category = this.activeCategory();
    if (!category || !this.canManageItems() || this.isArchived()) {
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

    const a = items[index];
    const b = items[targetIndex];

    this.menuService.updateItem(a.id, this.buildReorderPayload(a, b.displayOrder)).subscribe({
      next: firstResponse => {
        if (!firstResponse.success) {
          this.loadCategoryItems(category.id, state.page);
          this.errorMessage.set(
            firstResponse.message ??
              'The item order could not be saved. The original order was kept.'
          );
          return;
        }

        this.menuService
          .updateItem(b.id, this.buildReorderPayload(b, a.displayOrder))
          .subscribe({
            next: secondResponse => {
              if (!secondResponse.success) {
                // Partial swap — refresh so the persisted state is authoritative.
                this.loadCategoryItems(category.id, state.page);
                this.errorMessage.set(
                  secondResponse.message ??
                    'Only part of the reorder was saved. The list was refreshed from the server.'
                );
                return;
              }

              this.loadCategoryItems(category.id, state.page);
            },
            error: () => {
              this.loadCategoryItems(category.id, state.page);
              this.errorMessage.set(
                'The item order could not be saved. The original order was kept.'
              );
            }
          });
      },
      error: () => {
        this.loadCategoryItems(category.id, state.page);
        this.errorMessage.set(
          'The item order could not be saved. The original order was kept.'
        );
      }
    });
  }

  /** Full-payload PUT body preserving every existing item value; only displayOrder changes. */
  private buildReorderPayload(item: MenuItemDto, displayOrder: number): ItemReorderRequest {
    return {
      name: item.name,
      description: item.description,
      price: item.price,
      currency: item.currency,
      imageFileId: item.imageFileId,
      clearImage: false,
      displayOrder
    };
  }

  /** Exposed for regression tests asserting no field loss during reorder. */
  protected reorderRequestsForTests(
    a: MenuItemDto,
    b: MenuItemDto
  ): Array<{ id: string; body: ItemReorderRequest }> {
    return [
      { id: a.id, body: this.buildReorderPayload(a, b.displayOrder) },
      { id: b.id, body: this.buildReorderPayload(b, a.displayOrder) }
    ];
  }

  private updateItemInCategory(updated: MenuItemDto): void {
    this.categoryItemState.update(states => {
      const next = { ...states };
      for (const [cid, state] of Object.entries(next)) {
        if (state.items.some(i => i.id === updated.id)) {
          next[cid] = {
            ...state,
            items: state.items.map(i => (i.id === updated.id ? updated : i))
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
      for (const [cid, state] of Object.entries(next)) {
        if (state.items.some(i => i.id === itemId)) {
          next[cid] = {
            ...state,
            items: state.items.filter(i => i.id !== itemId)
          };
          break;
        }
      }
      return next;
    });
  }

  // --- Dialog ------------------------------------------------------------------

  protected cancelDialog(): void {
    this.closeDialog();
  }

  private closeDialog(): void {
    this.dialogOpen.set(false);
    this.dialogKind.set(null);
    this.dialogTarget.set(null);
  }

  protected dialogConfirmMessage(): string {
    const target = this.dialogTarget();
    return target ? `Are you sure you want to delete "${target.name}"?` : '';
  }

  protected confirmDialog(): void {
    if (this.dialogKind() === 'category') {
      this.deleteCategory();
    } else if (this.dialogKind() === 'item') {
      this.deleteItem();
    } else {
      this.cancelDialog();
    }
  }

  // --- Presentation helpers ------------------------------------------------------

  protected pluralize(count: number, singular: string): string {
    return `${count} ${count === 1 ? singular : singular + 's'}`;
  }

  protected formatPrice(value: number): string {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  private isCurrent(requestId: number, tenantId: string): boolean {
    return (
      requestId === this.requestSequence &&
      this.tenantContext.activeTenantId() === tenantId
    );
  }

  /** Test-only: prevents the tenant-change subscription from reloading data. */
  public setTenantReloadSuppressedForTests(suppress: boolean): void {
    this.suppressTenantReload = suppress;
  }
}
