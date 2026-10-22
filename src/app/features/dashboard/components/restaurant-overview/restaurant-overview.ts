import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import {
  LucideChefHat,
  LucideCircleAlert,
  LucidePlus
} from '@lucide/angular';
import { Button } from '../../../../shared/components/button/button';
import { LoadingSpinner } from '../../../../shared/components/loading-spinner/loading-spinner';
import type { DashboardCollection } from '../../models/dashboard-snapshot.model';
import type { RestaurantDto } from '../../../websites/models/restaurant.model';

/**
 * Restaurant section of the dashboard.
 *
 * Renders the restaurants of the active tenant. The component receives the
 * already loaded collection; it never calls an API on its own.
 */
@Component({
  selector: 'app-restaurant-overview',
  standalone: true,
  imports: [
    Button,
    LoadingSpinner,
    LucideChefHat,
    LucideCircleAlert,
    LucidePlus
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './restaurant-overview.html',
  styleUrl: './restaurant-overview.css'
})
export class RestaurantOverview {
  readonly restaurants = input<DashboardCollection<RestaurantDto> | null>(null);
  readonly loading = input(false);

  /** Emitted when the user asks to create a restaurant. */
  readonly createRestaurant = output<void>();

  protected restaurantLocation(restaurant: RestaurantDto): string {
    return [restaurant.city, restaurant.country]
      .filter(part => typeof part === 'string' && part.trim().length > 0)
      .join(', ');
  }
}
