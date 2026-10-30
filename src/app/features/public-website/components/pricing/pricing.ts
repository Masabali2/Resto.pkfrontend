import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  type OnDestroy,
  type OnInit,
} from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  LucideArrowRight,
  LucideBuilding2,
  LucideCheck,
  LucideChevronDown,
  LucideGlobe,
  LucideRefreshCw,
  LucideSparkles,
  LucideStar,
  LucideStore,
  LucideTriangleAlert,
  LucideZap,
} from '@lucide/angular';
import { AuthStateService } from '../../../../core/services/auth-state.service';
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
import {
  annualSavingsLabel,
  annualSavingsPercent,
  formatSavingsPercent,
  isPaidPlanGroup,
  listCurrencies,
  monthlyEquivalent,
  paidGroupsForCurrency,
  PLAN_DISPLAY_NAMES,
  REQUIRED_PLAN_CODES,
  type BillingInterval,
} from './pricing.util';

interface PaidSelection {
  readonly group: PresentedPlanGroup;
  readonly interval: BillingInterval;
  readonly variant: PlanVariant;
}

/**
 * The public pricing section.
 *
 * Every plan, price, currency, description and entitlement comes from
 * `GET /api/subscriptions/plans/public`. The component only decides how to
 * present that data: it filters the free trial out of the paid cards, groups
 * monthly/yearly rows by plan code + currency and never invents a price,
 * discount or limit.
 *
 * Resto.pk does not process payments yet. Selecting a paid plan therefore
 * persists the choice (for the existing onboarding flow) and shows the
 * payment-unavailable notice — it never activates a subscription.
 */
@Component({
  selector: 'app-pricing',
  standalone: true,
  imports: [
    LucideArrowRight,
    LucideBuilding2,
    LucideCheck,
    LucideChevronDown,
    LucideGlobe,
    LucideRefreshCw,
    LucideSparkles,
    LucideStar,
    LucideStore,
    LucideTriangleAlert,
    LucideZap,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pricing.html',
  styleUrl: './pricing.css',
})
export class Pricing implements OnInit, OnDestroy {
  private readonly subscriptionService = inject(SubscriptionService);
  private readonly planSelection = inject(PlanSelectionService);
  private readonly authState = inject(AuthStateService);
  private readonly router = inject(Router);

  /** Restores the persisted interval/currency when a visitor returns. */
  private readonly initialSelection = this.planSelection.current();

  readonly groups = signal<readonly PresentedPlanGroup[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly interval = signal<BillingInterval>(
    this.initialSelection?.interval ?? 'Monthly',
  );
  readonly currency = signal(this.initialSelection?.currency ?? 'PKR');
  readonly currencies = signal<readonly string[]>(['PKR']);
  readonly paidPlan = signal<PaidSelection | null>(null);
  readonly selectingCode = signal<string | null>(null);

  readonly skeletonRows = [0, 1, 2] as const;

  /** Template-accessible formatting helpers. */
  protected readonly formatLimits = formatLimits;
  protected readonly formatPrice = formatPlanPrice;
  protected readonly formatMonthlyEquivalent = monthlyEquivalent;
  protected readonly formatSavings = formatSavingsPercent;

  readonly paidGroups = computed(() =>
    paidGroupsForCurrency(this.groups(), this.currency()),
  );

  /** Exactly the three approved paid plans, in Starter → Business order. */
  readonly displayPlans = computed<readonly PresentedPlanGroup[]>(() => {
    const byCode = new Map(
      this.paidGroups().map((group) => [group.code.toLowerCase(), group]),
    );

    return REQUIRED_PLAN_CODES.map((code) => byCode.get(code)).filter(
      (group): group is PresentedPlanGroup => group !== undefined,
    );
  });

  readonly annualSavings = computed(() =>
    annualSavingsLabel(this.displayPlans()),
  );

  readonly freeTrial = computed(
    () =>
      this.groups().find(
        (group) =>
          group.code.toLowerCase() === 'free-trial' &&
          !isPaidPlanGroup(group),
      ) ?? null,
  );

  /**
   * A user-facing report when the published catalogue cannot be presented
   * honestly. The page shows this instead of placeholder plans or prices.
   */
  readonly catalogueIssue = computed<string | null>(() => {
    if (this.loading() || this.error() !== null) {
      return null;
    }

    const paid = this.paidGroups();

    if (paid.length === 0) {
      return `No paid subscription plans are published in ${this.currency()} right now.`;
    }

    if (paid.length !== REQUIRED_PLAN_CODES.length) {
      return `The ${this.currency()} catalogue publishes ${paid.length} paid plan${
        paid.length === 1 ? '' : 's'
      }; this page expects exactly ${REQUIRED_PLAN_CODES.length}. No placeholder prices are shown.`;
    }

    const missing = REQUIRED_PLAN_CODES.filter(
      (code) => !paid.some((group) => group.code.toLowerCase() === code),
    );

    if (missing.length > 0) {
      const names = missing
        .map((code) => PLAN_DISPLAY_NAMES[code] ?? code)
        .join(', ');

      return `The ${this.currency()} catalogue is missing ${names}. No placeholder prices are shown.`;
    }

    return null;
  });

  readonly controlsDisabled = computed(
    () =>
      this.loading() ||
      this.error() !== null ||
      this.catalogueIssue() !== null,
  );

  private selectionTimer: ReturnType<typeof setTimeout> | null = null;

  async ngOnInit(): Promise<void> {
    await this.loadPlans();
  }

  ngOnDestroy(): void {
    this.clearPendingSelection();
  }

  retry(): void {
    void this.loadPlans();
  }

  selectInterval(interval: BillingInterval): void {
    if (this.interval() === interval || this.controlsDisabled()) {
      return;
    }

    this.clearPendingSelection();
    this.interval.set(interval);
    this.paidPlan.set(null);
  }

  selectCurrency(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;

    if (!this.currencies().includes(value) || value === this.currency()) {
      return;
    }

    this.clearPendingSelection();
    this.currency.set(value);
    this.paidPlan.set(null);
  }

  selectedVariant(group: PresentedPlanGroup): PlanVariant | null {
    return this.interval() === 'Monthly' ? group.monthly : group.yearly;
  }

  limitsOf(group: PresentedPlanGroup): readonly string[] {
    return formatLimits(
      group.maxStaff,
      group.maxMenuItems,
      group.maxOrdersPerMonth,
    );
  }

  billingLabel(interval: BillingInterval): string {
    return interval === 'Monthly' ? 'per month' : 'per year';
  }

  isRecommended(group: PresentedPlanGroup): boolean {
    return group.code.toLowerCase() === 'professional';
  }

  isSelected(group: PresentedPlanGroup): boolean {
    const selection = this.paidPlan();

    return (
      selection !== null &&
      selection.group.code === group.code &&
      selection.group.currency === group.currency
    );
  }

  isSelecting(group: PresentedPlanGroup): boolean {
    return this.selectingCode() === group.code;
  }

  canChoose(group: PresentedPlanGroup): boolean {
    const variant = this.selectedVariant(group);

    return (
      variant !== null &&
      variant.isActive &&
      this.selectingCode() === null &&
      this.paidPlan() === null
    );
  }

  ctaLabel(group: PresentedPlanGroup): string {
    const variant = this.selectedVariant(group);

    if (!variant) {
      return this.interval() === 'Monthly'
        ? 'Monthly price unavailable'
        : 'Annual price unavailable';
    }

    if (!variant.isActive) {
      return 'Unavailable';
    }

    if (this.isSelecting(group)) {
      return 'Saving selection…';
    }

    if (this.isSelected(group)) {
      return 'Selection saved';
    }

    return `Choose ${group.name}`;
  }

  savingsOf(group: PresentedPlanGroup): string | null {
    const percent = annualSavingsPercent(group);

    return percent === null ? null : formatSavingsPercent(percent);
  }

  /**
   * Persists the choice through the existing plan-selection service and then
   * shows the payment-unavailable notice. No subscription is created or
   * activated here; the backend remains the authority.
   */
  choosePlan(group: PresentedPlanGroup): void {
    const variant = this.selectedVariant(group);

    if (!variant || !variant.isActive || !this.canChoose(group)) {
      return;
    }

    const interval = this.interval();

    this.selectingCode.set(group.code);
    this.planSelection.select(group.code, interval, group.currency);

    // A short painted busy state prevents double submissions without
    // pretending that a payment or activation request is running.
    this.selectionTimer = setTimeout(() => {
      this.selectionTimer = null;
      this.paidPlan.set({ group, interval, variant });
      this.selectingCode.set(null);
    }, 180);
  }

  returnToPricing(): void {
    this.clearPendingSelection();
    this.paidPlan.set(null);
  }

  startFreeTrial(): void {
    const target = this.authState.isAuthenticated()
      ? '/subscription'
      : '/register';

    void this.router.navigate([target]);
  }

  goToDashboard(): void {
    void this.router.navigate(['/dashboard']);
  }

  private async loadPlans(): Promise<void> {
    this.clearPendingSelection();
    this.loading.set(true);
    this.error.set(null);
    this.paidPlan.set(null);

    try {
      const plans = await firstValueFrom(
        this.subscriptionService.loadPublicPlans(),
      );

      const groups = groupPlansByCode(plans);
      const availableCurrencies = listCurrencies(groups);

      this.groups.set(groups);
      this.currencies.set(availableCurrencies);

      if (!availableCurrencies.includes(this.currency())) {
        this.currency.set(availableCurrencies[0] ?? 'PKR');
      }
    } catch {
      this.groups.set([]);
      this.currencies.set(['PKR']);
      this.error.set(
        'We could not load the pricing plans right now. Please try again in a moment.',
      );
    } finally {
      this.loading.set(false);
    }
  }

  private clearPendingSelection(): void {
    if (this.selectionTimer !== null) {
      clearTimeout(this.selectionTimer);
      this.selectionTimer = null;
    }

    this.selectingCode.set(null);
  }
}
