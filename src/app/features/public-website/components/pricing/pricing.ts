import {
  Component,
  inject,
  signal,
  type OnInit,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';
import { Button } from '../../../../shared/components/button/button';
import { LoadingSpinner } from '../../../../shared/components/loading-spinner/loading-spinner';
import { SubscriptionService } from '../../../subscription/services/subscription.service';
import { PlanSelectionService } from '../../../subscription/services/plan-selection.service';
import {
  formatLimits,
  formatPlanPrice,
} from '../../../subscription/utils/subscription-status.util';
import {
  groupPlansByCode,
  type PlanVariant,
  type PresentedPlanGroup,
} from '../../../subscription/models/subscription-plan.model';

type ButtonVariant = 'primary' | 'outline';

interface PriceVariant {
  readonly group: PresentedPlanGroup;
  readonly interval: 'Monthly' | 'Yearly';
}

@Component({
  selector: 'app-pricing',
  standalone: true,
  imports: [Button, LoadingSpinner],
  templateUrl: './pricing.html',
  styleUrl: './pricing.css',
})
export class Pricing implements OnInit {
  private readonly subscriptionService = inject(SubscriptionService);
  private readonly planSelection = inject(PlanSelectionService);
  private readonly router = inject(Router);

  readonly plans = signal<readonly PresentedPlanGroup[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly interval = signal<'Monthly' | 'Yearly'>('Monthly');
  /** A paid plan the user chose — shown as "payment setup unavailable". */
  readonly paidPlan = signal<PriceVariant | null>(null);

  /** Selection persisted across the login/register/onboarding redirects. */
  readonly selected = this.planSelection.current;

  /** Template-accessible helpers. */
  protected readonly formatLimits = formatLimits;
  protected readonly formatPrice = formatPlanPrice;

  async ngOnInit(): Promise<void> {
    try {
      this.loading.set(true);
      this.error.set(null);
      this.paidPlan.set(null);

      const plans = await firstValueFrom(
        this.subscriptionService.loadPublicPlans(),
      );

      this.plans.set(groupPlansByCode(plans));
    } catch {
      this.error.set(
        'We could not load the pricing plans right now. Please try again later.',
      );
    } finally {
      this.loading.set(false);
    }
  }

  retry(): void {
    void this.ngOnInit();
  }

  isInterval(interval: 'Monthly' | 'Yearly'): boolean {
    return this.interval() === interval;
  }

  selectInterval(interval: 'Monthly' | 'Yearly'): void {
    this.interval.set(interval);
    this.paidPlan.set(null);
  }

  variantOf(
    group: PresentedPlanGroup,
    interval: 'Monthly' | 'Yearly',
  ): PlanVariant | null {
    const variant =
      interval === 'Monthly' ? group.monthly : group.yearly;

    return variant ?? null;
  }

  /** The variant of `group` for the currently selected interval. */
  selectedVariant(group: PresentedPlanGroup): PlanVariant {
    return (
      this.variantOf(group, this.interval()) ?? {
        interval: this.interval(),
        price: 0,
        isActive: false,
      }
    );
  }

  billingLabel(interval: 'Monthly' | 'Yearly'): string {
    return interval === 'Monthly' ? 'per month' : 'per year';
  }

  buttonVariant(group: PresentedPlanGroup): ButtonVariant {
    return this.selectedVariant(group).price === 0 ? 'primary' : 'outline';
  }

  async choosePlan(group: PresentedPlanGroup, interval: 'Monthly' | 'Yearly'): Promise<void> {
    const variant = this.variantOf(group, interval);

    if (!variant || !variant.isActive) {
      return;
    }

    this.interval.set(interval);
    this.planSelection.select(group.code, interval);

    if (variant.price === 0) {
      // The free trial plan requires no payment. Activation goes through the
      // existing workspace trial flow, which validates eligibility server-side.
      void this.router.navigate(['/subscription']);
      return;
    }

    // Paid plans cannot be activated yet — Resto.pk does not process payments.
    this.paidPlan.set({ group, interval });
  }

  returnToPricing(): void {
    this.paidPlan.set(null);
  }

  goToDashboard(): void {
    void this.router.navigate(['/dashboard']);
  }
}
