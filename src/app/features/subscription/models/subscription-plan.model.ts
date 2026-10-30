/**
 * A subscription plan as it is published by the backend.
 *
 * Every field mirrors `SubscriptionPlanDto` exactly. The UI never invents
 * prices, features or limits: whatever the API returns is what is rendered.
 */
export interface SubscriptionPlan {
  readonly id: string;
  /** Stable plan code grouping the monthly and yearly variants of one plan. */
  readonly code: string;
  readonly name: string;
  readonly description: string | null;
  /** Plan price in `currency` units. `0` means the plan costs nothing. */
  readonly price: number;
  readonly currency: string;
  /** `Monthly`, `Quarterly`, `Yearly` or `OneTime`. */
  readonly billingInterval: string;
  /** `0` means unlimited. */
  readonly maxStaff: number;
  readonly maxMenuItems: number;
  readonly maxOrdersPerMonth: number;
  readonly isActive: boolean;
}

/**
 * A plan prepared for display.
 *
 * `isFree` is derived from the real price of the plan. Resto.pk has no
 * payment integration, so a plan with a price cannot be activated yet — the
 * UI states that plainly instead of pretending a checkout exists.
 */
export interface PresentedPlan {
  readonly plan: SubscriptionPlan;
  /** A plan with a price of zero requires no payment. */
  readonly isFree: boolean;
  /** Formatted price, e.g. `PKR 4,999`. */
  readonly formattedPrice: string;
  /** Formatted limits, e.g. `Up to 15 staff members`. */
  readonly limits: readonly string[];
}

/**
 * One billing variant of a plan within a grouped plan catalogue.
 */
export interface PlanVariant {
  readonly interval: 'Monthly' | 'Yearly';
  readonly price: number;
  /** Currency of this exact price row, as returned by the backend. */
  readonly currency: string;
  readonly isActive: boolean;
}

/**
 * A plan grouped by its stable code (and currency) so the monthly and yearly
 * prices of the same plan can be shown side by side and switched with a single
 * selector.
 *
 * Limits are taken from the monthly variant when present, otherwise the
 * yearly variant — both variants of a plan carry the same entitlements.
 *
 * The currency is part of the grouping key: a price row is never paired with
 * a row of another currency, so the UI can never label a PKR amount as USD.
 */
export interface PresentedPlanGroup {
  readonly code: string;
  readonly name: string;
  readonly description: string | null;
  /** Currency shared by every variant in this group. */
  readonly currency: string;
  readonly monthly: PlanVariant | null;
  readonly yearly: PlanVariant | null;
  /** `0` means unlimited. */
  readonly maxStaff: number;
  readonly maxMenuItems: number;
  readonly maxOrdersPerMonth: number;
  /** True when at least one variant is active and selectable. */
  readonly isAvailable: boolean;
}

/**
 * Groups a flat list of backend plans by their stable code and currency,
 * pairing the monthly and yearly prices of each plan. Plans without a code
 * are returned as single-variant groups.
 *
 * Grouping by code + currency is deliberate: when the catalogue later
 * publishes the same logical plan in more than one currency, the monthly row
 * of one currency must never be paired with the yearly row of another one.
 */
export function groupPlansByCode(
  plans: readonly SubscriptionPlan[],
): readonly PresentedPlanGroup[] {
  const byKey = new Map<string, SubscriptionPlan[]>();

  for (const plan of plans) {
    const code = plan.code ?? plan.id;
    const key = `${code}\u0000${plan.currency}`;
    const variants = byKey.get(key) ?? [];
    variants.push(plan);
    byKey.set(key, variants);
  }

  const groups: PresentedPlanGroup[] = [];

  for (const variants of byKey.values()) {
    const monthly = variants.find((p) => p.billingInterval === 'Monthly');
    const yearly = variants.find((p) => p.billingInterval === 'Yearly');
    const base = monthly ?? yearly ?? variants[0];

    if (!base) {
      continue;
    }

    groups.push({
      code: base.code ?? base.id,
      name: base.name,
      description: base.description,
      currency: base.currency,
      monthly: monthly
        ? {
            interval: 'Monthly',
            price: monthly.price,
            currency: monthly.currency,
            isActive: monthly.isActive,
          }
        : null,
      yearly: yearly
        ? {
            interval: 'Yearly',
            price: yearly.price,
            currency: yearly.currency,
            isActive: yearly.isActive,
          }
        : null,
      maxStaff: base.maxStaff,
      maxMenuItems: base.maxMenuItems,
      maxOrdersPerMonth: base.maxOrdersPerMonth,
      isAvailable: variants.some((p) => p.isActive),
    });
  }

  return groups;
}
