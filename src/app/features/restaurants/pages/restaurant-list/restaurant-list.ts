import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { RestaurantService } from '../../../websites/services/restaurant.service';
import { AuthStateService } from '../../../../core/services/auth-state.service';
import { AuthorizationService } from '../../../../core/services/authorization.service';
import { TenantContextService } from '../../../../core/services/tenant-context.service';
import { HttpErrorHandlerService } from '../../../../core/services/http-error-handler.service';
import { Button } from '../../../../shared/components/button/button';
import { LoadingSpinner } from '../../../../shared/components/loading-spinner/loading-spinner';
import type { ApiResponse } from '../../../../core/models/api-response.model';
import type { RestaurantDto, RestaurantsPage } from '../../../websites/models/restaurant.model';

type PageState = 'loading' | 'list' | 'empty' | 'no-workspace' | 'forbidden' | 'error';

@Component({
  selector: 'app-restaurant-list',
  standalone: true,
  imports: [DatePipe, RouterLink, Button, LoadingSpinner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './restaurant-list.html',
  styleUrl: './restaurant-list.css'
})
export class RestaurantList {
  private readonly restaurantService = inject(RestaurantService);
  private readonly authState = inject(AuthStateService);
  private readonly authorization = inject(AuthorizationService);
  private readonly tenantContext = inject(TenantContextService);
  private readonly httpErrorHandler = inject(HttpErrorHandlerService);

  protected readonly pageState = signal<PageState>('loading');
  protected readonly errorMessage = signal('');
  protected readonly restaurants = signal<RestaurantDto[]>([]);

  private loadedTenantId: string | null = null;
  private requestSequence = 0;

  protected readonly activeTenantName = computed(
    () => this.authState.authResult()?.activeTenant?.name ?? null
  );

  protected readonly canCreateRestaurant = computed(() =>
    this.authorization.hasPermission('Restaurant.Create')
  );

  constructor() {
    this.load();

    this.tenantContext.activeTenantId
      .pipe(takeUntilDestroyed())
      .subscribe(tenantId => {
        if (tenantId !== this.loadedTenantId) {
          this.load();
        }
      });
  }

  protected load(): void {
    const tenantIdAtRequest = this.tenantContext.activeTenantId();

    if (tenantIdAtRequest === null) {
      this.restaurants.set([]);
      this.errorMessage.set('');
      this.pageState.set('no-workspace');
      return;
    }

    const requestId = ++this.requestSequence;
    this.loadedTenantId = tenantIdAtRequest;
    this.pageState.set('loading');
    this.errorMessage.set('');

    this.restaurantService.getRestaurants()
      .pipe(finalize(() => {}))
      .subscribe({
        next: (response: ApiResponse<RestaurantsPage>) => {
          if (!this.isCurrent(requestId, tenantIdAtRequest)) {
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
          this.pageState.set(response.data.items.length === 0 ? 'empty' : 'list');
        },
        error: (error: unknown) => {
          if (!this.isCurrent(requestId, tenantIdAtRequest)) {
            return;
          }

          if (error instanceof HttpErrorResponse && error.status === 403) {
            this.pageState.set(this.canCreateRestaurant() ? 'empty' : 'forbidden');
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

  protected retry(): void {
    this.load();
  }

  private isCurrent(requestId: number, tenantId: string): boolean {
    return requestId === this.requestSequence &&
      this.tenantContext.activeTenantId() === tenantId;
  }
}
