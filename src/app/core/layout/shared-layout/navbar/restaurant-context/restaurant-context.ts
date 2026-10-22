
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { RestaurantSelector } from '../restaurant-selector/restaurant-selector';
import { buildRestaurantInitials } from '../../../../utils/restaurant-initials.util';
import { formatRestaurantLocation } from '../../../../utils/restaurant-location.util';
import { resolveRestaurantStatus } from '../../../../utils/restaurant-status.util';
import type { ActiveRestaurantState } from '../../../../models/active-restaurant.model';
import type { RestaurantDto } from '../../../../models/restaurant.model';

/**
 * Restaurant context of the navbar.
 *
 * The component renders the restaurant the user is currently working with
 * inside the active tenant. It receives the already resolved state from the
 * shared restaurant state service and reports the user's choices; it never
 * calls the API and never owns a copy of the selection.
 *
 * The card shows the real restaurant: its name, its location, the status
 * returned by the backend and — when the tenant owns more than one
 * restaurant — a switcher for the other restaurants of the same tenant.
 */
@Component({
  selector: 'app-restaurant-context',
  standalone: true,
  imports: [RouterLink, RestaurantSelector],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './restaurant-context.html',
  styleUrl: './restaurant-context.css'
})
export class RestaurantContext {
  /** The selected restaurant of the active tenant. */
  readonly restaurant = input<RestaurantDto | null>(null);

  /** Every restaurant of the active tenant. */
  readonly restaurants = input<readonly RestaurantDto[]>([]);

  /** State of the shared restaurant state. */
  readonly state = input<ActiveRestaurantState>('idle');

  /** True while a request is running. */
  readonly loading = input(false);

  /** Message of the last failure, if any. */
  readonly errorMessage = input<string | null>(null);

  /** True when the user may create a restaurant in this workspace. */
  readonly canCreateRestaurant = input(false);

  /** Emits the id of the restaurant the user wants to work with. */
  readonly restaurantSelected = output<string>();

  /** Emits when the user asks for the restaurants to be read again. */
  readonly retry = output<void>();

  protected readonly initials = computed(() =>
    buildRestaurantInitials(this.restaurant()?.name)
  );

  protected readonly status = computed(() =>
    resolveRestaurantStatus(this.restaurant()?.status)
  );

  protected readonly location = computed(() =>
    formatRestaurantLocation(this.restaurant()?.city, this.restaurant()?.country)
  );

  protected readonly showSelector = computed(() => this.restaurants().length > 1);
}
