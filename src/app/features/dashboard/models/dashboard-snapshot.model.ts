import type { MenuDto } from '../../menu/models/menu.model';
import type { RestaurantDto } from '../../websites/models/restaurant.model';
import type { WebsiteDto } from '../../websites/models/website.model';

/** Availability of a single dashboard data source. */
export type DashboardDataStatus = 'ready' | 'unavailable';

/**
 * A tenant scoped collection together with its availability.
 *
 * `unavailable` means the data could not be read. It must never be presented
 * as a zero count, otherwise a backend problem would look like real progress.
 */
export interface DashboardCollection<T> {
  readonly status: DashboardDataStatus;
  readonly items: readonly T[];
  readonly totalCount: number;
}

/**
 * Everything the dashboard reads for the active tenant in a single request
 * cycle. Each collection degrades on its own so one failing endpoint never
 * breaks the whole page.
 */
export interface DashboardSnapshot {
  readonly restaurants: DashboardCollection<RestaurantDto>;
  readonly websites: DashboardCollection<WebsiteDto>;
  readonly menus: DashboardCollection<MenuDto>;
}
