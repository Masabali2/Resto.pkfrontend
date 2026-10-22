import { inject, Injectable } from '@angular/core';
import { catchError, forkJoin, map, Observable, of, switchMap } from 'rxjs';
import { MenuService } from '../../menu/services/menu.service';
import { RestaurantService } from '../../websites/services/restaurant.service';
import { WebsiteService } from '../../websites/services/website.service';
import type { ApiResponse } from '../../../core/models/api-response.model';
import type { MenuDto } from '../../menu/models/menu.model';
import type { PagedResult } from '../../websites/models/paged-result.model';
import type {
  RestaurantDto,
  RestaurantsPage
} from '../../websites/models/restaurant.model';
import type { WebsiteDto, WebsitesPage } from '../../websites/models/website.model';
import type {
  DashboardCollection,
  DashboardSnapshot
} from '../models/dashboard-snapshot.model';

const UNAVAILABLE: DashboardCollection<never> = {
  status: 'unavailable',
  items: [],
  totalCount: 0
};

/**
 * Maps an API response to a dashboard collection. A rejected or unsuccessful
 * response is reported as `unavailable` so the UI can show an honest state
 * instead of an empty list.
 */
function toCollection<T, P extends { items: T[]; totalCount: number }>(
  response: ApiResponse<P>
): DashboardCollection<T> {
  if (!response.success || !response.data) {
    return UNAVAILABLE;
  }

  return {
    status: 'ready',
    items: response.data.items ?? [],
    totalCount: response.data.totalCount
  };
}

/**
 * Reads the tenant scoped data shown on the dashboard.
 *
 * The service only orchestrates the existing restaurant, website and menu
 * services; it owns no HTTP details of its own. Every source is loaded
 * independently, so a failing endpoint degrades its own card to the
 * "unavailable" state instead of breaking the whole page. Menus belong to a
 * restaurant, so they are read for the first restaurant of the active tenant
 * and stay unavailable while the tenant has none.
 */
@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly restaurantService = inject(RestaurantService);
  private readonly websiteService = inject(WebsiteService);
  private readonly menuService = inject(MenuService);

  loadSnapshot(): Observable<DashboardSnapshot> {
    return this.loadRestaurants().pipe(
      switchMap(restaurants =>
        forkJoin({
          restaurants: of(restaurants),
          websites: this.loadWebsites(),
          menus: this.loadMenus(restaurants)
        })
      )
    );
  }

  private loadRestaurants(): Observable<DashboardCollection<RestaurantDto>> {
    return this.restaurantService.getRestaurants().pipe(
      map(response => toCollection<RestaurantDto, RestaurantsPage>(response)),
      catchError(() => of(UNAVAILABLE))
    );
  }

  private loadWebsites(): Observable<DashboardCollection<WebsiteDto>> {
    return this.websiteService.getWebsites().pipe(
      map(response => toCollection<WebsiteDto, WebsitesPage>(response)),
      catchError(() => of(UNAVAILABLE))
    );
  }

  private loadMenus(
    restaurants: DashboardCollection<RestaurantDto>
  ): Observable<DashboardCollection<MenuDto>> {
    const restaurant = restaurants.items[0];

    if (!restaurant) {
      return of(UNAVAILABLE);
    }

    return this.menuService.getMenus(restaurant.id).pipe(
      map(response =>
        toCollection<MenuDto, PagedResult<MenuDto>>(response)
      ),
      catchError(() => of(UNAVAILABLE))
    );
  }
}
