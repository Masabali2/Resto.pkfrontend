import type { SubscriptionPlan } from '../models/subscription-plan.model';
import type {
  ResolvedSubscriptionStatus,
  SubscriptionState
} from '../models/subscription-status.model';

/**
 * Pure helpers that turn the verified backend state into display values.
 *
 * They never guess: every branch is driven by data the API returned.
 */

const DAY_IN_MS = 24 * 60 * 60 * 1000;

/**
 * Formats a price using the currency the backend reported.
 * Falls back to a plain amount when the currency code is not known to the
 * runtime, so an unexpected code never breaks the page.
 */
export function formatPlanPrice(price: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2
    }).format(price);
  } catch {
    return `${price.toLocaleString()} ${currency}`;
  }
}

/**
 * Formats a UTC timestamp as a calendar date.
 * The date is rendered in UTC so the displayed expiry matches the exact
 * moment the backend recorded.
 */
export function formatUtcDate(value: string | Date | null): string | null {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeZone: 'UTC'
  }).format(date);
}

/**
 * Whole days left between two timestamps.
 * Both values come from the backend, so the browser clock is never involved.
 */
export function daysBetween(fromUtc: string, toUtc: string): number {
  const from = new Date(fromUtc).getTime();
  const to = new Date(toUtc).getTime();

  if (Number.isNaN(from) || Number.isNaN(to)) {
    return 0;
  }

  return Math.max(0, Math.ceil((to - from) / DAY_IN_MS));
}

/**
 * Presents a plan for display.
 */
export function presentPlan(plan: SubscriptionPlan) {
  const limits: string[] = [];

  limits.push(
    plan.maxStaff === 0
      ? 'Unlimited staff members'
      : `Up to ${plan.maxStaff} staff member${plan.maxStaff === 1 ? '' : 's'}`
  );

  limits.push(
    plan.maxMenuItems === 0
      ? 'Unlimited menu items'
      : `Up to ${plan.maxMenuItems} menu item${plan.maxMenuItems === 1 ? '' : 's'}`
  );

  limits.push(
    plan.maxOrdersPerMonth === 0
      ? 'Unlimited monthly orders'
      : `Up to ${plan.maxOrdersPerMonth} orders per month`
  );

  return {
    plan,
    isFree: plan.price === 0,
    formattedPrice:
      plan.price === 0
        ? 'Free'
        : formatPlanPrice(plan.price, plan.currency),
    limits
  };
}

/**
 * Resolves the workspace subscription state into the status the UI shows.
 *
 * The states are exactly the ones the backend can prove:
 *  - `pending`   — the workspace exists but was never activated,
 *  - `trial`     — a running free trial,
 *  - `active`    — an eligible subscription,
 *  - `expired`   — a trial or subscription that no longer covers today,
 *  - `none`      — the workspace has no subscription at all,
 *  - `unavailable` — the state could not be read.
 */
export function resolveSubscriptionStatus(
  state: SubscriptionState | null,
  loading: boolean
): ResolvedSubscriptionStatus {
  if (!state) {
    return {
      kind: loading ? 'unavailable' : 'none',
      title: loading ? 'Loading subscription' : 'Subscription unavailable',
      detail: loading
        ? 'We are checking the subscription of this workspace.'
        : 'We could not read the subscription of this workspace.',
      daysRemaining: null,
      canUseProtectedFeatures: false,
      canStartTrial: false
    };
  }

  const subscription = state.subscription;
  const trial = state.trial;

  if (subscription) {
    const endDate = subscription.endDate;
    const daysRemaining =
      endDate && subscription.isEntitled
        ? daysBetween(state.serverTimeUtc, endDate)
        : null;

    const expiryDate = formatUtcDate(endDate);

    if (subscription.status === 'Trial') {
      if (!subscription.isEntitled) {
        return {
          kind: 'expired',
          title: 'Your free trial has ended',
          detail: expiryDate
            ? `The trial ended on ${expiryDate}. Start a new plan to restore access.`
            : 'The trial has ended. Start a new plan to restore access.',
          daysRemaining: 0,
          canUseProtectedFeatures: false,
          canStartTrial: trial.eligible
        };
      }

      return {
        kind: 'trial',
        title: 'Free trial active',
        detail: expiryDate
          ? `Your free trial ends on ${expiryDate}.`
          : 'Your free trial is running.',
        daysRemaining,
        canUseProtectedFeatures: true,
        canStartTrial: false
      };
    }

    if (!subscription.isEntitled) {
      return {
        kind: 'expired',
        title: `Subscription ${subscription.status.toLowerCase()}`,
        detail: expiryDate
          ? `This subscription ended on ${expiryDate}. Choose a plan to restore access.`
          : 'This subscription is no longer active. Choose a plan to restore access.',
        daysRemaining: 0,
        canUseProtectedFeatures: false,
        canStartTrial: trial.eligible
      };
    }

    return {
      kind: 'active',
      title: `${subscription.planName} plan active`,
      detail: expiryDate
        ? `Your subscription is active until ${expiryDate}.`
        : 'Your subscription is active.',
      daysRemaining,
      canUseProtectedFeatures: true,
      canStartTrial: false
    };
  }

  if (state.tenantStatus === 'Pending' && trial.eligible) {
    return {
      kind: 'pending',
      title: 'Workspace pending activation',
      detail: `Start your ${trial.trialDurationDays}-day free trial to activate this workspace.`,
      daysRemaining: null,
      canUseProtectedFeatures: false,
      canStartTrial: true
    };
  }

  return {
    kind: 'none',
    title: 'No subscription yet',
    detail:
      trial.reason ??
      'This workspace has no subscription. Choose a plan to restore access.',
    daysRemaining: null,
    canUseProtectedFeatures: false,
    canStartTrial: trial.eligible
  };
}
