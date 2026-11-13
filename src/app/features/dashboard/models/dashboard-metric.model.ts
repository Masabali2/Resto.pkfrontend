
/** Availability of a single dashboard statistic. */
export type DashboardMetricStatus = 'ready' | 'loading' | 'unavailable';

/** Icon shown on a dashboard statistic card. */
export type DashboardMetricIcon =
  | 'workspace'
  | 'restaurant'
  | 'website'
  | 'menu'
  | 'orders'
  | 'revenue'
  | 'pending'
  | 'completed'
  | 'cancelled'
  | 'customers'
  | 'store';

/**
 * A single statistic card.
 *
 * `value` is already formatted for display (e.g. a PKR amount or a count).
 * `status` distinguishes real zero values from loading/unavailable states so a
 * backend problem never looks like legitimate progress.
 */
export interface DashboardMetric {
  readonly id: string;
  readonly label: string;
  /** Already formatted for display. */
  readonly value: string;
  /** Short explanation shown under the value. */
  readonly hint: string;
  readonly icon: DashboardMetricIcon;
  readonly status: DashboardMetricStatus;
}
