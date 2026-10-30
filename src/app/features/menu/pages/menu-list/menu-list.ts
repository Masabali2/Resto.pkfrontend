import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { RestaurantService } from '../../../../core/services/restaurant.service';
import { MenuService } from '../../services/menu.service';
import { AuthorizationService } from '../../../../core/services/authorization.service';
import { TenantContextService } from '../../../../core/services/tenant-context.service';
import { HttpErrorHandlerService } from '../../../../core/services/http-error-handler.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ConfirmationDialog } from '../../../../shared/components/confirmation-dialog/confirmation-dialog';
import { Button } from '../../../../shared/components/button/button';
import { LoadingSpinner } from '../../../../shared/components/loading-spinner/loading-spinner';
import type { ApiResponse } from '../../../../core/models/api-response.model';
import type { DefaultMenuDetailsDto, MenuDto } from '../../models/menu.model';
import type { RestaurantDto } from '../../../websites/models/restaurant.model';
import { formatPrice } from '../../models/menu-price.util';

type PageState = 'loading' | 'list' | 'empty' | 'no-workspace' | 'forbidden' | 'error';
type MenuSection = 'default' | 'restaurant';
type DefaultMenuState = 'idle' | 'loading' | 'loaded' | 'error';

@Component({
  selector: 'app-menu-list',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    Button,
    LoadingSpinner,
    ConfirmationDialog
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './menu-list.html',
  styleUrl: './menu-list.css'
})
export class MenuList {
  private readonly restaurantService = inject(RestaurantService);
  private readonly menuService = inject(MenuService);
  private readonly authorization = inject(AuthorizationService);
  private readonly tenantContext = inject(TenantContextService);
  private readonly httpErrorHandler = inject(HttpErrorHandlerService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly pageState = signal<PageState>('loading');
  protected readonly errorMessage = signal('');
  protected readonly restaurants = signal<RestaurantDto[]>([]);
  protected readonly menus = signal<MenuDto[]>([]);
  protected readonly selectedRestaurantId = signal<string | null>(null);
  protected readonly menusLoading = signal(false);

  protected readonly activeSection = signal<MenuSection>('restaurant');
  protected readonly defaultMenu = signal<DefaultMenuDetailsDto | null>(null);
  protected readonly defaultMenuState = signal<DefaultMenuState>('idle');
  protected readonly defaultMenuError = signal('');
  protected readonly defaultMenuExpanded = signal(false);
  protected readonly copyingDefault = signal(false);
  protected readonly copyDialogOpen = signal(false);

  protected readonly archiveOpen = signal(false);
  protected readonly archiveTarget = signal<MenuDto | null>(null);

  protected readonly canCreateMenu = computed(() =>
    this.authorization.hasPermission('Menu.Create')
  );
  protected readonly canCopyDefaultMenu = computed(() =>
    this.canCreateMenu()
  );
  protected readonly canUpdateMenu = computed(() =>
    this.authorization.hasPermission('Menu.Update')
  );
  protected readonly canDeleteMenu = computed(() =>
    this.authorization.hasPermission('Menu.Delete')
  );
  protected readonly canViewMenu = computed(() =>
    this.authorization.hasPermission('Menu.View')
  );
  protected readonly canManageMenu = computed(() =>
    this.authorization.hasPermission('Menu.View') &&
    this.authorization.hasPermission('MenuItem.View')
  );

  private loadedTenantId: string | null = null;
  private requestSequence = 0;
  private menuSequence = 0;
  private lastProcessedQueryId: string | null = null;
  private defaultMenuOpenedId: string | null = null;

  constructor() {
    toObservable(this.tenantContext.activeTenantId)
      .pipe(takeUntilDestroyed())
      .subscribe(tenantId => {
        if (tenantId === this.loadedTenantId) {
          return;
        }

        this.loadedTenantId = tenantId;
        this.selectedRestaurantId.set(null);
        this.menus.set([]);
        this.lastProcessedQueryId = null;
        this.defaultMenuOpenedId = null;
        this.pageState.set('loading');
        this.errorMessage.set('');

        this.loadRestaurants();
      });

    this.route.queryParamMap
      .pipe(takeUntilDestroyed())
      .subscribe(params => {
        const queryId = params.get('restaurantId') ?? null;
        this.resolveRestaurantSelection(queryId);
      });
  }

  protected loadRestaurants(): void {
    const tenantId = this.tenantContext.activeTenantId();

    if (tenantId === null) {
      this.restaurants.set([]);
      this.menus.set([]);
      this.selectedRestaurantId.set(null);
      this.lastProcessedQueryId = null;
      this.pageState.set('no-workspace');
      this.errorMessage.set('');
      return;
    }

    const requestId = ++this.requestSequence;
    this.loadedTenantId = tenantId;
    this.pageState.set('loading');
    this.errorMessage.set('');

    this.restaurantService.getRestaurants()
      .subscribe({
        next: (response: ApiResponse<{ items: RestaurantDto[] }>) => {
          if (!this.isCurrent(requestId, tenantId)) {
            return;
          }

          if (!response.success || !response.data) {
            this.errorMessage.set(
              response.message ?? 'Unable to load your restaurants. Please try again.'
            );
            this.pageState.set('error');
            return;
          }

          this.restaurants.set(response.data.items);
          this.lastProcessedQueryId = null;
          this.resolveRestaurantSelection(
            this.route.snapshot.queryParamMap.get('restaurantId') ?? null
          );
        },
        error: (error: unknown) => {
          if (!this.isCurrent(requestId, tenantId)) {
            return;
          }

          if (error instanceof HttpErrorResponse && error.status === 403) {
            this.pageState.set('forbidden');
            return;
          }

          this.errorMessage.set(
            this.httpErrorHandler.extractBackendMessage(error) ??
              'Unable to load your restaurants. Please try again.'
          );
          this.pageState.set('error');
        }
      });
  }

  private resolveRestaurantSelection(queryId: string | null): void {
    const restaurants = this.restaurants();
    let selected: string | null = null;

    if (queryId && restaurants.some(r => r.id === queryId)) {
      selected = queryId;
    } else if (!queryId && restaurants.length === 1) {
      selected = restaurants[0].id;
      this.syncRestaurantUrl(selected);
    }

    const changed = selected !== this.selectedRestaurantId();
    this.selectedRestaurantId.set(selected);

    if (!selected) {
      this.menus.set([]);
      this.defaultMenuOpenedId = null;
      this.pageState.set(
        restaurants.length === 0 ? 'empty' : 'list'
      );
      this.errorMessage.set(
        restaurants.length === 0
          ? 'No restaurants found. Set up your first restaurant to manage menus.'
          : ''
      );
      return;
    }

    if (changed || this.menus().length === 0) {
      this.loadMenus();
    } else {
      this.pageState.set('list');
    }
  }

  private syncRestaurantUrl(restaurantId: string): void {
    const current = this.route.snapshot.queryParamMap.get('restaurantId');
    if (current === restaurantId) {
      return;
    }

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { restaurantId },
      replaceUrl: true
    });
  }

  protected selectRestaurant(restaurantId: string): void {
    this.lastProcessedQueryId = null;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { restaurantId },
      replaceUrl: true
    });
  }

  protected loadMenus(): void {
    if (this.menusLoading()) {
      return;
    }

    const restaurantId = this.selectedRestaurantId();
    if (!restaurantId) {
      this.menus.set([]);
      this.pageState.set('list');
      return;
    }

    const requestId = ++this.menuSequence;
    this.menusLoading.set(true);
    this.pageState.set('loading');
    this.errorMessage.set('');

    this.menuService.getMenus(restaurantId)
      .pipe(finalize(() => this.menusLoading.set(false)))
      .subscribe({
        next: (response: ApiResponse<{ items: MenuDto[] }>) => {
          if (!this.isMenuCurrent(requestId, restaurantId)) {
            return;
          }

          if (!response.success || !response.data) {
            this.errorMessage.set(
              response.message ?? 'Unable to load menus. Please try again.'
            );
            this.pageState.set('error');
            return;
          }

          this.menus.set(response.data.items ?? []);
          this.pageState.set(
            this.menus().length === 0 ? 'empty' : 'list'
          );

          this.navigateToDefaultMenu();
        },
        error: (error: unknown) => {
          if (!this.isMenuCurrent(requestId, restaurantId)) {
            return;
          }

          this.menusLoading.set(false);

          if (error instanceof HttpErrorResponse && error.status === 403) {
            this.pageState.set('forbidden');
            return;
          }

          this.errorMessage.set(
            this.httpErrorHandler.extractBackendMessage(error) ??
              'Unable to load menus. Please try again.'
          );
          this.pageState.set('error');
        }
      });
  }

  /* ---------- Default Menus section ---------- */

  protected selectSection(section: MenuSection): void {
    if (this.activeSection() === section) {
      return;
    }

    this.activeSection.set(section);

    if (section === 'default' && this.defaultMenuState() === 'idle') {
      this.loadDefaultMenu();
    }
  }

  protected loadDefaultMenu(): void {
    if (this.defaultMenuState() === 'loading') {
      return;
    }

    const tenantId = this.tenantContext.activeTenantId();
    if (tenantId === null) {
      this.defaultMenuState.set('error');
      this.defaultMenuError.set('No active workspace.');
      return;
    }

    this.defaultMenuState.set('loading');
    this.defaultMenuError.set('');

    this.menuService.getDefaultMenu().subscribe({
      next: (response: ApiResponse<DefaultMenuDetailsDto>) => {
        if (!response.success || !response.data) {
          this.defaultMenuState.set('error');
          this.defaultMenuError.set(
            response.message ?? 'Unable to load the default menu.'
          );
          return;
        }

        this.defaultMenu.set(response.data);
        this.defaultMenuState.set('loaded');
      },
      error: (error: unknown) => {
        this.defaultMenuState.set('error');

        if (error instanceof HttpErrorResponse && error.status === 403) {
          this.defaultMenuError.set(
            'You do not have permission to view the default menu.'
          );
          return;
        }

        this.defaultMenuError.set(
          this.httpErrorHandler.extractBackendMessage(error) ??
            'Unable to load the default menu. Please try again.'
        );
      }
    });
  }

  protected retryDefaultMenu(): void {
    this.defaultMenuState.set('idle');
    this.loadDefaultMenu();
  }

  protected toggleDefaultMenu(): void {
    this.defaultMenuExpanded.update(expanded => !expanded);
  }

  protected defaultMenuStatusLabel(status: string): string {
    return this.statusLabel(status);
  }

  protected openCopyDefaultDialog(): void {
    if (this.copyingDefault()) {
      return;
    }

    if (!this.selectedRestaurantId()) {
      this.defaultMenuError.set(
        'Select a destination restaurant before using this menu.'
      );
      return;
    }

    if (!this.canCopyDefaultMenu()) {
      this.defaultMenuError.set(
        'You do not have permission to create menus in this workspace.'
      );
      return;
    }

    this.defaultMenuError.set('');
    this.copyDialogOpen.set(true);
  }

  protected cancelCopyDefault(): void {
    this.copyDialogOpen.set(false);
  }

  protected copyDefaultConfirmMessage(): string {
    const menu = this.defaultMenu();
    const restaurantId = this.selectedRestaurantId();

    if (!menu || !restaurantId) {
      return '';
    }

    return `Use "${menu.name}" for ${this.restaurantName(restaurantId)}? A draft copy will be created for this restaurant.`;
  }

  protected confirmCopyDefault(): void {
    this.copyDialogOpen.set(false);

    if (this.copyingDefault()) {
      return;
    }

    const restaurantId = this.selectedRestaurantId();
    const menu = this.defaultMenu();

    if (!restaurantId || !menu) {
      this.defaultMenuError.set(
        'Select a destination restaurant before using this menu.'
      );
      return;
    }

    this.copyingDefault.set(true);
    this.defaultMenuError.set('');

    this.menuService.copyDefaultMenu(restaurantId)
      .pipe(finalize(() => this.copyingDefault.set(false)))
      .subscribe({
        next: (response: ApiResponse<MenuDto>) => {
          if (!response.success || !response.data) {
            this.defaultMenuError.set(
              response.message ?? 'Unable to copy the default menu.'
            );
            return;
          }

          const copied = response.data;
          this.notificationService.success(
            `"${copied.name}" was added to ${this.restaurantName(restaurantId)}.`
          );

          void this.router.navigate(['/menus', copied.id, 'manage'], {
            queryParams: { restaurantId },
            queryParamsHandling: 'merge'
          });
        },
        error: (error: unknown) => {
          this.defaultMenuError.set(
            this.httpErrorHandler.extractBackendMessage(error) ??
              'Unable to copy the default menu. Please try again.'
          );
        }
      });
  }

  private isCurrent(requestId: number, tenantId: string): boolean {
    return requestId === this.requestSequence &&
      this.tenantContext.activeTenantId() === tenantId;
  }

  private isMenuCurrent(requestId: number, restaurantId: string): boolean {
    return requestId === this.menuSequence &&
      this.selectedRestaurantId() === restaurantId &&
      this.tenantContext.activeTenantId() !== null;
  }

  protected retry(): void {
    this.loadRestaurants();
  }

  protected goToSetupRestaurant(): void {
    void this.router.navigate(['/setup/restaurant']);
  }

  protected createMenu(): void {
    void this.router.navigate(['/menus/new'], {
      queryParams: { restaurantId: this.selectedRestaurantId() },
      queryParamsHandling: 'merge'
    });
  }

  /**
   * Opens the default menu of the selected restaurant automatically.
   *
   * Resolution rule (no default-menu flag exists on the MenuDto contract,
   * so the first result is never assumed to be the default):
   *  - exactly one menu   -> open that menu's management page,
   *  - zero or many menus -> stay on the list, which acts as the menu
   *    selector (never arbitrarily pick one).
   *
   * `replaceUrl` keeps the entry `/menus` out of the history stack so a
   * browser back or refresh never re-enters the list and re-triggers the
   * navigation, and keeps the resulting management URL shareable and
   * refresh-safe.
   */
  private navigateToDefaultMenu(): void {
    if (this.pageState() !== 'list') {
      return;
    }

    const menus = this.menus();
    const restaurantId = this.selectedRestaurantId();

    if (
      this.activeSection() !== 'restaurant' ||
      menus.length !== 1 ||
      !restaurantId ||
      menus[0].id === this.defaultMenuOpenedId ||
      !this.canManageMenu()
    ) {
      return;
    }

    this.defaultMenuOpenedId = menus[0].id;

    void this.router.navigate(['/menus', menus[0].id, 'manage'], {
      queryParams: { restaurantId },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  protected editMenu(menu: MenuDto): void {
    if (!this.canUpdateMenu()) {
      return;
    }

    void this.router.navigate(['/menus', menu.id, 'edit'], {
      queryParams: { restaurantId: this.selectedRestaurantId() },
      queryParamsHandling: 'merge'
    });
  }

  protected viewMenu(menu: MenuDto): void {
    if (!this.canViewMenu()) {
      return;
    }

    void this.router.navigate(['/menus', menu.id], {
      queryParams: { restaurantId: this.selectedRestaurantId() },
      queryParamsHandling: 'merge'
    });
  }

  protected manageMenu(menu: MenuDto): void {
    if (!this.canManageMenu()) {
      return;
    }

    void this.router.navigate(['/menus', menu.id, 'manage'], {
      queryParams: { restaurantId: this.selectedRestaurantId() },
      queryParamsHandling: 'merge'
    });
  }

  protected setMenuActive(menu: MenuDto, isActive: boolean): void {
    if (!this.canUpdateMenu()) {
      return;
    }

    this.menuService.setMenuActive(menu.id, isActive)
      .subscribe({
        next: response => {
          if (!response.success || !response.data) {
            this.errorMessage.set(
              response.message ?? 'Unable to update the menu. Please try again.'
            );
            return;
          }

          const updated = response.data;
          this.menus.update(items =>
            items.map(m => (m.id === updated.id ? updated : m))
          );
          this.notificationService.success(
            `Menu ${updated.isActive ? 'activated' : 'deactivated'}.`
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

  protected openArchiveDialog(menu: MenuDto): void {
    if (!this.canDeleteMenu()) {
      return;
    }

    this.archiveTarget.set(menu);
    this.archiveOpen.set(true);
  }

  protected confirmArchive(): void {
    const menu = this.archiveTarget();
    if (!menu) {
      return;
    }

    this.archiveOpen.set(false);
    this.archiveTarget.set(null);

    this.menuService.archiveMenu(menu.id).subscribe({
      next: () => {
        this.menus.update(items => items.filter(m => m.id !== menu.id));
        this.notificationService.success(`"${menu.name}" has been archived.`);
      },
      error: error => {
        this.errorMessage.set(
          this.httpErrorHandler.extractBackendMessage(error) ??
            'Unable to archive the menu. Please try again.'
        );
      }
    });
  }

  protected cancelArchive(): void {
    this.archiveOpen.set(false);
    this.archiveTarget.set(null);
  }

  protected archiveConfirmMessage(): string {
    const target = this.archiveTarget();

    return target
      ? `Are you sure you want to archive "${target.name}"? This cannot be undone.`
      : '';
  }

  protected formatAmount(value: number): string {
    return formatPrice(value);
  }

  protected statusLabel(status: string): string {
    switch (status) {
      case 'Draft':
        return 'Draft';
      case 'Published':
        return 'Published';
      case 'Archived':
        return 'Archived';
      default:
        return status;
    }
  }

  protected restaurantName(id: string): string {
    return this.restaurants().find(r => r.id === id)?.name ?? '';
  }
}
