import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input
} from '@angular/core';
import { LucideCheck, LucideSparkles } from '@lucide/angular';
import { presentPlan } from '../../utils/subscription-status.util';
import type {
  PresentedPlan,
  SubscriptionPlan
} from '../../models/subscription-plan.model';

/**
 * Renders the plans that are actually available for the active workspace.
 *
 * The component is purely presentational: the plans come from the backend and
 * every displayed value (name, description, price, currency, billing
 * interval and limits) is taken from that response.
 *
 * Resto.pk does not process payments, so a plan with a price is presented as
 * "requires a payment method" instead of pretending a checkout exists.
 */
@Component({
  selector: 'app-subscription-plan-list',
  standalone: true,
  imports: [LucideCheck, LucideSparkles],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './subscription-plan-list.html',
  styleUrls: ['./subscription-plan-list.css', '../subscription-tokens.css']
})
export class SubscriptionPlanList {
  readonly plans = input<readonly SubscriptionPlan[]>([]);
  readonly loading = input(false);

  protected readonly presented = computed<readonly PresentedPlan[]>(() =>
    this.plans().map(plan => presentPlan(plan))
  );

  protected readonly isEmpty = computed(
    () => !this.loading() && this.presented().length === 0
  );

  protected readonly hasPaidPlans = computed(
    () => this.presented().some(entry => !entry.isFree)
  );

  protected billingLabel(interval: string): string {
    switch (interval) {
      case 'Monthly':
        return 'per month';
      case 'Quarterly':
        return 'per quarter';
      case 'Yearly':
        return 'per year';
      case 'OneTime':
        return 'one time';
      default:
        return interval;
    }
  }
}
