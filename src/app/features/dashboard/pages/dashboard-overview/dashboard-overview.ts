import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthStateService } from '../../../../core/services/auth-state.service';
import { HttpErrorHandlerService } from '../../../../core/services/http-error-handler.service';
import { RestaurantService } from '../../../websites/services/restaurant.service';
import { Button } from '../../../../shared/components/button/button';
import { LoadingSpinner } from '../../../../shared/components/loading-spinner/loading-spinner';
import type { ApiResponse } from '../../../../core/models/api-response.model';
import type { RestaurantsPage } from '../../../websites/models/restaurant.model';

type WorkspaceState = 'loading' | 'ready' | 'error';

@Component({
  selector: 'app-dashboard-overview',
  standalone: true,
  imports: [RouterLink, Button, LoadingSpinner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard-overview.html',
  styleUrl: './dashboard-overview.css'
})
export class DashboardOverview {
  private readonly authState = inject(AuthStateService);
  private readonly restaurantService = inject(RestaurantService);
  private readonly httpErrorHandler = inject(HttpErrorHandlerService);

  protected readonly workspaceState = signal<WorkspaceState>('loading');
  protected readonly workspaceError = signal('');
  protected readonly hasRestaurant = signal(false);

  protected readonly greetingName = computed(
    () => this.authState.authResult()?.user?.userName ?? 'there'
  );

  protected readonly activeTenantName = computed(
    () => this.authState.authResult()?.activeTenant?.name ?? null
  );

  constructor() {
    this.loadWorkspace();
  }

  protected loadWorkspace(): void {
    this.workspaceState.set('loading');
    this.workspaceError.set('');

    this.restaurantService.getRestaurants(1, 1).subscribe({
      next: (response: ApiResponse<RestaurantsPage>) => {
        if (!response.success || !response.data) {
          this.workspaceError.set(
            response.message ?? 'Unable to load your workspace. Please try again.'
          );
          this.workspaceState.set('error');
          return;
        }

        this.hasRestaurant.set(response.data.totalCount > 0);
        this.workspaceState.set('ready');
      },
      error: (error: unknown) => {
        this.workspaceError.set(
          this.httpErrorHandler.handle(error, {
            unauthorizedMessage: 'Your session has expired. Please sign in again.',
            fallbackMessage: 'Unable to load your workspace. Please try again.'
          }).message
        );
        this.workspaceState.set('error');
      }
    });
  }
}
