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
import { RestaurantService } from '../../../websites/services/restaurant.service';
import { MenuService } from '../../services/menu.service';
import { AuthorizationService } from '../../../../core/services/authorization.service';
import { TenantContextService } from '../../../../core/services/tenant-context.service';
import { HttpErrorHandlerService } from '../../../../core/services/http-error-handler.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ConfirmationDialog } from '../../../../shared/components/confirmation-dialog/confirmation-dialog';
import { Button } from '../../../../shared/components/button/button';
import { LoadingSpinner } from '../../../../shared/components/loading-spinner/loading-spinner';
import type { ApiResponse } from '../../../../core/models/api-response.model';
import type { MenuDto } from '../../models/menu.model';
import type { RestaurantDto } from '../../../websites/models/restaurant.model';

type PageState = 'loading' | 'list' | 'empty' | 'no-workspace' | 'forbidden' | 'error';

@Component({
  selector: 'app-menu-list',
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

  protected readonly archiveOpen = signal(false);
  protected readonly archiveTarget = signal<MenuDto | null>(null);

  protected readonly canCreateMenu = computed(() =>
    this.authorization.hasPermission('Menu.Create')
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

  private loadedTenantId: string | null = null;
  private requestSequence = 0;
  private menuSequence = 0;
  private lastProcessedQueryId: string | null = null;

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

    this.loadRestaurants();
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
      .pipe(finalize(() => {}))
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

  protected setMenuActive(menu: MenuDto, isActive: boolean): void {
    if (!this.canUpdateMenu()) {
      return;
    }

    this.menuService.setMenuActive(menu.id, isActive)
      .pipe(finalize(() => {}))
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
      next: response => {
        if (!response.success) {
          this.errorMessage.set(
            response.message ?? 'Unable to archive the menu. Please try again.'
          );
          return;
        }

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
