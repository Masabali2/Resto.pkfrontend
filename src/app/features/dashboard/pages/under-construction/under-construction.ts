import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { RestaurantService } from '../../../websites/services/restaurant.service';
import { HttpErrorHandlerService } from '../../../../core/services/http-error-handler.service';
import { Button } from '../../../../shared/components/button/button';
import { LoadingSpinner } from '../../../../shared/components/loading-spinner/loading-spinner';
import type { ApiResponse } from '../../../../core/models/api-response.model';
import type { RestaurantsPage } from '../../../websites/models/restaurant.model';

type RestaurantState = 'loading' | 'ready' | 'error';

@Component({
  selector: 'app-under-construction',
  standalone: true,
  imports: [RouterLink, Button, LoadingSpinner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './under-construction.html',
  styleUrl: './under-construction.css'
})
export class UnderConstruction {
  private readonly restaurantService = inject(RestaurantService);
  private readonly httpErrorHandler = inject(HttpErrorHandlerService);

  protected readonly restaurantState = signal<RestaurantState>('loading');
  protected readonly restaurantCount = signal(0);
  protected readonly restaurantError = signal('');

  protected readonly needsFirstRestaurant = computed(
    () => this.restaurantState() === 'ready' && this.restaurantCount() === 0
  );

  constructor() {
    this.loadRestaurants();
  }

  protected loadRestaurants(): void {
    this.restaurantState.set('loading');
    this.restaurantError.set('');

    this.restaurantService.getRestaurants(1, 1).subscribe({
      next: (response: ApiResponse<RestaurantsPage>) => {
        if (!response.success || !response.data) {
          this.restaurantError.set(
            response.message ?? 'Unable to load your restaurants. Please try again.'
          );
          this.restaurantState.set('error');
          return;
        }

        this.restaurantCount.set(response.data.totalCount);
        this.restaurantState.set('ready');
      },
      error: (error: unknown) => {
        this.restaurantError.set(
          this.httpErrorHandler.handle(error, {
            unauthorizedMessage: 'Your session has expired. Please sign in again.',
            fallbackMessage: 'Unable to load your restaurants. Please try again.'
          }).message
        );
        this.restaurantState.set('error');
      }
    });
  }
}
