import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal
} from '@angular/core';
import { LucideArrowRight, LucideClock, LucideShieldCheck } from '@lucide/angular';
import { Button } from '../../../../shared/components/button/button';
import { InlineError } from '../../../../shared/components/inline-error/inline-error/inline-error';
import { SubscriptionPlanList } from '../subscription-plan-list/subscription-plan-list';
import {
  daysBetween,
  formatUtcDate
} from '../../utils/subscription-status.util';
import type { SubscriptionState } from '../../models/subscription-status.model';

/**
 * How the secondary "view the plans" action behaves.
 *
 *  - `inline` expands the plan list inside the offer (used on the dashboard),
 *  - `page` asks the host to open the plan-selection page (used in the
 *    shared dialog),
 *  - `none` hides the action (used on the plan-selection page itself, which
 *    already lists the plans).
 */
export type SubscriptionPlanLink = 'inline' | 'page' | 'none';

/**
 * The shared subscription offer.
 *
 * It is rendered from every entry point (dashboard after workspace creation,
 * the "create restaurant" action, the shared dialog and the plan-selection
 * page) so the wording, the trial rules and the plan list are identical
 * everywhere.
 *
 * The component is presentational: it receives the verified workspace state
 * and reports the user intent through its outputs. It never performs an HTTP
 * call itself and never decides on its own whether a trial may be started —
 * that answer comes from the backend.
 */
@Component({
  selector: 'app-subscription-offer',
  standalone: true,
  imports: [
    Button,
    InlineError,
    LucideArrowRight,
    LucideClock,
    LucideShieldCheck,
    SubscriptionPlanList
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './subscription-offer.html',
  styleUrls: ['./subscription-offer.css', '../subscription-tokens.css']
})
export class SubscriptionOffer {
  /** Verified state of the active workspace. */
  readonly state = input<SubscriptionState | null>(null);

  /** True while the trial request is in flight. */
  readonly loading = input(false);

  /** Last error message of the trial request. */
  readonly error = input<string | null>(null);

  /** Behaviour of the secondary "view the plans" action. */
  readonly planLink = input<SubscriptionPlanLink>('inline');

  /** Emitted when the user asks for the free trial to be started. */
  readonly startTrial = output<void>();

  /** Emitted when the user wants to see the available plans. */
  readonly viewPlans = output<void>();

  protected readonly plansVisible = signal(false);

  protected readonly trial = computed(() => this.state()?.trial ?? null);

  protected readonly subscription = computed(
    () => this.state()?.subscription ?? null
  );

  protected readonly canStartTrial = computed(
    () => this.trial()?.eligible === true
  );

  protected readonly trialDuration = computed(
    () => this.trial()?.trialDurationDays ?? 0
  );

  protected readonly trialExpiry = computed(() => {
    const state = this.state();
    const subscription = state?.subscription;

    if (!state || !subscription?.endDate) {
      return null;
    }

    return formatUtcDate(subscription.endDate);
  });

  protected readonly trialDaysRemaining = computed(() => {
    const state = this.state();
    const subscription = state?.subscription;

    if (!state || !subscription?.endDate || !subscription.isEntitled) {
      return null;
    }

    return daysBetween(state.serverTimeUtc, subscription.endDate);
  });

  protected readonly trialUnavailableReason = computed(
    () => this.trial()?.reason ?? null
  );

  protected togglePlans(): void {
    if (this.planLink() === 'page') {
      this.viewPlans.emit();

      return;
    }

    if (this.planLink() === 'none') {
      return;
    }

    const next = !this.plansVisible();

    this.plansVisible.set(next);

    if (next) {
      this.viewPlans.emit();
    }
  }
}
