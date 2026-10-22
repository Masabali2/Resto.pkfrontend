
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal
} from '@angular/core';
import { buildRestaurantInitials } from '../../../../utils/restaurant-initials.util';
import { formatRestaurantLocation } from '../../../../utils/restaurant-location.util';
import { resolveRestaurantStatus } from '../../../../utils/restaurant-status.util';
import type { RestaurantDto } from '../../../../models/restaurant.model';

interface RestaurantOption {
  id: string;
  name: string;
  initials: string;
  meta: string;
  selected: boolean;
}

/**
 * Compact restaurant switcher of the navbar.
 *
 * The component is presentational: it only shows the restaurants of the
 * active tenant that the shared restaurant state provides and reports the
 * restaurant the user picked. It never changes the active tenant and never
 * talks to the API.
 */
@Component({
  selector: 'app-restaurant-selector',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './restaurant-selector.html',
  styleUrl: './restaurant-selector.css'
})
export class RestaurantSelector {
  /** Restaurants of the active tenant. */
  readonly restaurants = input<readonly RestaurantDto[]>([]);

  /** Id of the restaurant that is currently selected. */
  readonly selectedId = input<string | null>(null);

  /** Emits the id of the restaurant the user chose. */
  readonly select = output<string>();

  protected readonly open = signal(false);

  protected readonly options = computed<RestaurantOption[]>(() => {
    const selectedId = this.selectedId();

    return this.restaurants().map(restaurant => ({
      id: restaurant.id,
      name: restaurant.name,
      initials: buildRestaurantInitials(restaurant.name),
      meta: this.describe(restaurant),
      selected: restaurant.id === selectedId
    }));
  });

  protected toggle(): void {
    this.open.update(open => !open);
  }

  protected close(): void {
    this.open.set(false);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
    }
  }

  protected choose(id: string): void {
    this.close();
    this.select.emit(id);
  }

  /** Location and status of a restaurant, used as option metadata. */
  private describe(restaurant: RestaurantDto): string {
    const location = formatRestaurantLocation(
      restaurant.city,
      restaurant.country
    );
    const status = resolveRestaurantStatus(restaurant.status).label;

    return [location, status].filter(part => part.length > 0).join(' · ');
  }
}
