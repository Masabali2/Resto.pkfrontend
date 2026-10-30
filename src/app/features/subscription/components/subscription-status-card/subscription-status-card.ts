import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output
} from '@angular/core';
import { LucideArrowRight, LucideCreditCard } from '@lucide/angular';
import { Button } from '../../../../shared/components/button/button';
import { LoadingSpinner } from '../../../../shared/components/loading-spinner/loading-spinner';
import {
  formatLimits,
  formatPlanPrice,
  formatUtcDate,
  resolveSubscriptionStatus,
} from '../../utils/subscription-status.util';
import type { SubscriptionState } from '../../models/subscription-status.model';

/**
 * Compact card that shows the subscription state of the active workspace.
 *
 * It only renders states that the backend actually proved. When the state
 * cannot be read the card says so instead of guessing.
 */
@Component({
  selector: 'app-subscription-status-card',
  standalone: true,
  imports: [Button, LoadingSpinner, LucideArrowRight, LucideCreditCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './subscription-status-card.html',
  styleUrls: ['./subscription-status-card.css', '../subscription-tokens.css']
})
export class SubscriptionStatusCard {
  readonly state = input<SubscriptionState | null>(null);
  readonly loading = input(false);

  /** Emitted when the user asks to manage the subscription. */
  readonly manage = output<void>();

  protected readonly status = computed(() =>
    resolveSubscriptionStatus(this.state(), this.loading())
  );

  protected readonly badgeLabel = computed(() => {
    switch (this.status().kind) {
      case 'pending':
        return 'Pending activation';
      case 'trial':
        return 'Free trial';
      case 'active':
        return 'Active';
      case 'expired':
        return 'Ended';
      case 'unavailable':
        return 'Unavailable';
      default:
        return 'No subscription';
    }
  });

  protected readonly currentPlan = computed(() => {
    const state = this.state();
    const subscription = state?.subscription ?? null;

    if (!subscription) {
      return null;
    }

    // Price, currency and interval live on the plan catalogue, not on the
    // subscription record. Resolve the current plan from the available plans
    // the backend returned — never invent a price.
    const plan = state?.availablePlans.find((p) => p.id === subscription.planId) ?? null;

    const expiryDate = formatUtcDate(subscription.endDate);
    const startDate = formatUtcDate(subscription.startDate);

    return {
      name: subscription.planName,
      priceAvailable: plan !== null,
      amount:
        plan && plan.price !== 0
          ? formatPlanPrice(plan.price, plan.currency)
          : plan
            ? 'Free'
            : null,
      currency: plan?.currency,
      interval: plan?.billingInterval,
      limits: plan
        ? formatLimits(
            plan.maxStaff,
            plan.maxMenuItems,
            plan.maxOrdersPerMonth,
          )
        : [],
      startDate,
      expiryDate,
      autoRenew: subscription.autoRenew,
      isEntitled: subscription.isEntitled,
    };
  });
}
