
/** Availability of a single dashboard statistic. */
export type DashboardMetricStatus = 'ready' | 'loading' | 'unavailable';

/** Icon shown on a dashboard statistic card. */
export type DashboardMetricIcon = 'workspace' | 'restaurant' | 'website' | 'menu';

/**
 * A single statistic card.
 *
 * Only metrics backed by existing frontend data are rendered; business
 * metrics that the backend does not expose (orders, revenue) are not
 * invented here.
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
