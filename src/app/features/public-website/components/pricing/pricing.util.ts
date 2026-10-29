import type { PresentedPlanGroup } from '../../../subscription/models/subscription-plan.model';
import { formatPlanPrice } from '../../../subscription/utils/subscription-status.util';

export type BillingInterval = 'Monthly' | 'Yearly';

/**
 * The paid plans the public pricing page is allowed to present, in display
 * order. These are logical plan codes, not prices: every amount, description
 * and entitlement is still read from the public subscription API.
 */
export const REQUIRED_PLAN_CODES = [
  'starter',
  'professional',
  'business',
] as const;

export const PLAN_DISPLAY_NAMES: Record<string, string> = {
  starter: 'Starter',
  professional: 'Professional',
  business: 'Business',
};

/** True when at least one variant of the plan costs money. */
export function isPaidPlanGroup(group: PresentedPlanGroup): boolean {
  return (
    (group.monthly?.price ?? 0) > 0 || (group.yearly?.price ?? 0) > 0
  );
}

/**
 * Currencies that have a genuine published price. PKR is always kept in the
 * list because it is the base currency of Resto.pk; no currency is invented.
 */
export function listCurrencies(
  groups: readonly PresentedPlanGroup[],
): readonly string[] {
  const currencies = new Set(
    groups.filter(isPaidPlanGroup).map((group) => group.currency),
  );

  currencies.add('PKR');

  return [...currencies].sort((a, b) => {
    if (a === 'PKR') {
      return -1;
    }

    if (b === 'PKR') {
      return 1;
    }

    return a.localeCompare(b);
  });
}

/** All paid groups of one currency, in the preferred plan order. */
export function paidGroupsForCurrency(
  groups: readonly PresentedPlanGroup[],
  currency: string,
): readonly PresentedPlanGroup[] {
  const rank = (code: string): number => {
    const index = (REQUIRED_PLAN_CODES as readonly string[]).indexOf(
      code.toLowerCase(),
    );

    return index === -1 ? REQUIRED_PLAN_CODES.length : index;
  };

  return groups
    .filter(
      (group) => group.currency === currency && isPaidPlanGroup(group),
    )
    .sort((a, b) => {
      const byRank = rank(a.code) - rank(b.code);

      if (byRank !== 0) {
        return byRank;
      }

      const aPrice = a.monthly?.price ?? a.yearly?.price ?? 0;
      const bPrice = b.monthly?.price ?? b.yearly?.price ?? 0;

      return aPrice - bPrice;
    });
}

/**
 * Discount of the yearly price against twelve monthly payments, as a
 * percentage rounded to two decimals. Returns `null` when the plan has no
 * genuine saving (or no yearly price), so the UI never claims a discount that
 * the backend does not publish.
 */
export function annualSavingsPercent(
  group: PresentedPlanGroup,
): number | null {
  const monthly = group.monthly?.price;
  const yearly = group.yearly?.price;

  if (
    monthly === undefined ||
    yearly === undefined ||
    monthly <= 0 ||
    yearly <= 0
  ) {
    return null;
  }

  const twelveMonths = monthly * 12;

  if (yearly >= twelveMonths) {
    return null;
  }

  return Math.round(((twelveMonths - yearly) / twelveMonths) * 10000) / 100;
}

export function formatSavingsPercent(percent: number): string {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 2,
  }).format(percent);
}

/**
 * A single savings message for the billing selector. It is only produced when
 * at least one plan has a real saving; mixed catalogues say "up to" instead of
 * pretending every plan has the same discount.
 */
export function annualSavingsLabel(
  groups: readonly PresentedPlanGroup[],
): string | null {
  const savings = groups
    .map(annualSavingsPercent)
    .filter((value): value is number => value !== null && value > 0);

  if (savings.length === 0) {
    return null;
  }

  const min = Math.min(...savings);
  const max = Math.max(...savings);

  return min === max
    ? `Save ${formatSavingsPercent(min)}%`
    : `Save up to ${formatSavingsPercent(max)}%`;
}

/** Effective monthly cost of a yearly price, clearly derived from the total. */
export function monthlyEquivalent(
  group: PresentedPlanGroup,
): string | null {
  const yearly = group.yearly;

  if (!yearly || yearly.price <= 0) {
    return null;
  }

  return formatPlanPrice(yearly.price / 12, yearly.currency);
}
