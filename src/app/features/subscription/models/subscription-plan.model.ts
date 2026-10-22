/**
 * A subscription plan as it is published by the backend.
 *
 * Every field mirrors `SubscriptionPlanDto` exactly. The UI never invents
 * prices, features or limits: whatever the API returns is what is rendered.
 */
export interface SubscriptionPlan {
  readonly id: string;
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
