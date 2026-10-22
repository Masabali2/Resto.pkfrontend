import type { SubscriptionPlan } from './subscription-plan.model';
import type { TrialEligibility } from './trial-eligibility.model';

/** Mirrors `TenantSubscriptionSummaryDto`. */
export interface TenantSubscription {
  readonly id: string;
  readonly planId: string;
  readonly planName: string;
  /** `Trial`, `Active`, `PastDue`, `Cancelled` or `Expired`. */
  readonly status: string;
  readonly startDate: string;
  readonly endDate: string | null;
  readonly autoRenew: boolean;
  /** True when the subscription covers the current moment. */
  readonly isEntitled: boolean;
  readonly maxStaff: number;
  readonly maxMenuItems: number;
  readonly maxOrdersPerMonth: number;
}

/**
 * Complete subscription state of the active workspace.
 *
 * Mirrors `CurrentSubscriptionStateDto` and is the single authority the UI
 * uses. `serverTimeUtc` allows the remaining trial time to be derived from
 * the server clock instead of the browser clock.
 */
export interface SubscriptionState {
  readonly tenantId: string;
  readonly tenantName: string;
  /** `Pending`, `Active`, `Suspended` or `Cancelled`. */
  readonly tenantStatus: string;
  readonly hasSubscription: boolean;
  readonly subscription: TenantSubscription | null;
  readonly trial: TrialEligibility;
  readonly availablePlans: readonly SubscriptionPlan[];
  readonly serverTimeUtc: string;
}

/**
 * The user facing state of a workspace, derived from the verified backend
 * state. Only states that can be determined from real data are represented.
 */
export type SubscriptionStatusKind =
  | 'pending'
  | 'trial'
  | 'active'
  | 'expired'
  | 'unavailable'
  | 'none';

/** A subscription state resolved into a displayable status. */
export interface ResolvedSubscriptionStatus {
  readonly kind: SubscriptionStatusKind;
  readonly title: string;
  readonly detail: string;
  /** Whole days left, or `null` when the concept does not apply. */
  readonly daysRemaining: number | null;
  /** True when the workspace may use subscription protected features. */
  readonly canUseProtectedFeatures: boolean;
  /** True when the free trial can still be started. */
  readonly canStartTrial: boolean;
}
