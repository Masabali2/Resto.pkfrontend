import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { finalize, Observable } from 'rxjs';
import { LucideArrowRight, LucidePlus, LucideReceipt } from '@lucide/angular';
import { ActiveRestaurantStateService } from '../../../../core/services/active-restaurant-state.service';
import { AuthStateService } from '../../../../core/services/auth-state.service';
import { AuthorizationService } from '../../../../core/services/authorization.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { OrderApiService } from '../../../orders/services/order-api.service';
import { OrderStatusBadge } from '../../../orders/components/order-status-badge/order-status-badge';
import { TenantContextService } from '../../../../core/services/tenant-context.service';
import { SubscriptionFlowService } from '../../../subscription/services/subscription-flow.service';
import { SubscriptionOffer } from '../../../subscription/components/subscription-offer/subscription-offer';
import { SubscriptionRequiredDialog } from '../../../subscription/components/subscription-required-dialog/subscription-required-dialog';
import { SubscriptionStatusCard } from '../../../subscription/components/subscription-status-card/subscription-status-card';
import { resolveSubscriptionStatus, formatPlanPrice } from '../../../subscription/utils/subscription-status.util';
import { DashboardService } from '../../services/dashboard.service';
import { DashboardPageHeader } from '../../components/dashboard-page-header/dashboard-page-header';
import { DashboardStats } from '../../components/dashboard-stats/dashboard-stats';
import { OnboardingHighlights } from '../../components/onboarding-highlights/onboarding-highlights';
import { OnboardingWelcome } from '../../components/onboarding-welcome/onboarding-welcome';
import { OnboardingWorkspacePrompt } from '../../components/onboarding-workspace-prompt/onboarding-workspace-prompt';
import { QuickActions } from '../../components/quick-actions/quick-actions';
import { RestaurantOverview } from '../../components/restaurant-overview/restaurant-overview';
import { SetupProgress } from '../../components/setup-progress/setup-progress';
import { WorkspaceOverview } from '../../components/workspace-overview/workspace-overview';
import { WorkspacePicker } from '../../components/workspace-picker/workspace-picker';
import { LoadingSpinner } from '../../../../shared/components/loading-spinner/loading-spinner';
import { Button } from '../../../../shared/components/button/button';
import type {
  DashboardMetric,
  DashboardMetricIcon,
  DashboardMetricStatus
} from '../../models/dashboard-metric.model';
import type {
  DashboardCollection,
  DashboardSnapshot
} from '../../models/dashboard-snapshot.model';
import type { ApiResponse } from '../../../../core/models/api-response.model';
import type { QuickAction } from '../../models/quick-action.model';
import type { SetupStep } from '../../models/setup-step.model';
import type { ResolvedSubscriptionStatus } from '../../../subscription/models/subscription-status.model';
import type { RestaurantDto } from '../../../../core/models/restaurant.model';
import type {
  StaffOrderSummary,
  StaffOrderDetails,
  DailyOrderDto,
  OrderAnalyticsDto
} from '../../../orders/models/order.models';

type DashboardPageState =
  | 'loading'
  | 'onboarding'
  | 'select-tenant'
  | 'dashboard';

/**
 * Dashboard container.
 *
 * The component owns page level state only: which state the page is in, the
 * tenant scoped data it needs, and the navigation triggered by its sections.
 * Every section is rendered by a dedicated standalone component that receives
 * its data through inputs and reports user actions through outputs.
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
    imports: [
    Button,
    DashboardPageHeader,
    DashboardStats,
    LoadingSpinner,
    LucideArrowRight,
    LucidePlus,
    LucideReceipt,
    OnboardingHighlights,
    OnboardingWelcome,
    OnboardingWorkspacePrompt,
    OrderStatusBadge,
    QuickActions,
    RestaurantOverview,
    RouterLink,
    SetupProgress,
    SubscriptionOffer,
    SubscriptionRequiredDialog,
    SubscriptionStatusCard,
    WorkspaceOverview,
    WorkspacePicker
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard {
  private readonly router = inject(Router);
  private readonly authState = inject(AuthStateService);
  private readonly authorization = inject(AuthorizationService);
  private readonly notificationService = inject(NotificationService);
  private readonly tenantContext = inject(TenantContextService);
  private readonly dashboardService = inject(DashboardService);

  /** Shared subscription flow — the single plan-selection experience. */
  protected readonly subscriptionFlow = inject(SubscriptionFlowService);

  private readonly orderApi = inject(OrderApiService);

  protected readonly memberships = computed(
    () => this.authState.authResult()?.memberships ?? []
  );

  /** Verified subscription state of the active workspace. */
  protected readonly subscriptionState = this.subscriptionFlow.state;

  protected readonly subscriptionLoading = this.subscriptionFlow.loading;

  protected readonly subscriptionStatus = computed(() =>
    resolveSubscriptionStatus(
      this.subscriptionState(),
      this.subscriptionLoading()
    )
  );

  /**
   * True when the workspace is waiting for its trial. The offer is shown
   * inline on the dashboard so a freshly created workspace immediately
   * explains what happens next.
   */
  protected readonly showTrialOffer = computed(() => {
    const state = this.subscriptionState();

    return (
      !!state &&
      state.tenantStatus === 'Pending' &&
      state.trial.eligible &&
      !state.hasSubscription
    );
  });

  protected readonly activeTenant = computed(
    () => this.authState.authResult()?.activeTenant ?? null
  );

  protected readonly switching = this.tenantContext.switching;
  protected readonly switchError = signal<string | null>(null);

  protected readonly snapshot = signal<DashboardSnapshot | null>(null);
  protected readonly snapshotLoading = signal(false);
  protected readonly snapshotError = signal<string | null>(null);

  private loadedTenantId: string | null = null;
  private requestSequence = 0;

  protected readonly pageState = computed<DashboardPageState>(() => {
    if (!this.authState.authResult()) {
      return 'loading';
    }

    if (this.memberships().length === 0) {
      return 'onboarding';
    }

    if (!this.activeTenant()) {
      return 'select-tenant';
    }

    return 'dashboard';
  });

  protected readonly restaurants = computed(
    () => this.snapshot()?.restaurants ?? null
  );

  protected readonly websites = computed(() => this.snapshot()?.websites ?? null);

  protected readonly menus = computed(() => this.snapshot()?.menus ?? null);

  /**
   * The restaurant that is currently active for the workspace. All order,
   * revenue and menu data is scoped to this restaurant.
   */
  private readonly activeRestaurantStateService =
    inject(ActiveRestaurantStateService);

  protected readonly activeRestaurant = computed(() =>
    this.activeRestaurantStateService.restaurant()
  );

  protected readonly activeRestaurantState = computed(() =>
    this.activeRestaurantStateService.state()
  );

  protected readonly activeRestaurantError = computed(() =>
    this.activeRestaurantStateService.errorMessage()
  );

  /** Date range presets offered to the user. */
  protected readonly dateRanges = [
    { id: 'today', label: 'Today' },
    { id: '7days', label: 'Last 7 days' },
    { id: '30days', label: 'Last 30 days' },
    { id: 'month', label: 'This month' },
    { id: 'custom', label: 'Custom range' }
  ] as const;

  protected readonly dateRange = signal<'today' | '7days' | '30days' | 'month' | 'custom'>(
    '30days'
  );

  protected readonly customStart = signal<string | null>(null);

  protected readonly customEnd = signal<string | null>(null);

  /** Resolved start/end date (YYYY-MM-DD) for the selected range. */
  protected readonly startDate = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const format = (d: Date) =>
      d.toISOString().slice(0, 10);

    switch (this.dateRange()) {
      case 'today':
        return format(today);
      case '7days': {
        const start = new Date(today);
        start.setDate(start.getDate() - 6);
        return format(start);
      }
      case 'month': {
        const start = new Date(today.getFullYear(), today.getMonth(), 1);
        return format(start);
      }
      case 'custom':
        return this.customStart() ?? format(today);
      case '30days':
      default: {
        const start = new Date(today);
        start.setDate(start.getDate() - 29);
        return format(start);
      }
    }
  });

  protected readonly endDate = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (this.dateRange() === 'custom') {
      return this.customEnd() ?? formatDate(today);
    }

    return formatDate(today);
  });

  /** Order summary (KPI numbers) for the active restaurant and date range. */
  protected readonly orderSummary = signal<StaffOrderSummary | null>(null);

  protected readonly orderSummaryLoading = signal(false);

  protected readonly orderSummaryError = signal<string | null>(null);

  /** Daily order trend for the revenue chart. */
  protected readonly orderAnalytics = signal<OrderAnalyticsDto | null>(null);

  protected readonly orderAnalyticsLoading = signal(false);

  protected readonly orderAnalyticsError = signal<string | null>(null);

  /** Recent orders for the operational summary. */
  protected readonly recentOrders = signal<StaffOrderDetails[] | null>(null);

  protected readonly recentOrdersLoading = signal(false);

  protected readonly recentOrdersError = signal<string | null>(null);

  private loadedRestaurantId: string | null = null;

  private orderRequestSequence = 0;

  private loadedRequestKey: string | null = null;

  protected readonly hasRestaurants = computed(() => {
    const restaurants = this.restaurants();

    return restaurants?.status === 'ready' && restaurants.totalCount > 0;
  });

  protected readonly headerSubtitle = computed(() => {
    const workspaceName = this.activeTenant()?.name;

    return workspaceName
      ? `Welcome to ${workspaceName}. Your workspace is ready — now let's bring your restaurant online.`
      : 'Your workspace is ready — now let\'s bring your restaurant online.';
  });

  protected readonly metrics = computed<DashboardMetric[]>(() => [
    {
      id: 'workspaces',
      label: 'Workspaces',
      value: String(this.memberships().length),
      hint: 'Available to your account',
      icon: 'workspace',
      status: 'ready'
    },
    this.toMetric(
      'restaurants',
      'Restaurants',
      'restaurant',
      this.restaurants(),
      'Add a restaurant to get started'
    ),
    this.toMetric(
      'websites',
      'Websites',
      'website',
      this.websites(),
      'Build your first website'
    ),
    this.toMetric(
      'menus',
      'Menus',
      'menu',
      this.menus(),
      this.hasRestaurants() ? 'Add your first menu' : 'Add a restaurant first'
    )
  ]);

  protected readonly quickActions = computed<QuickAction[]>(() => {
    const canViewWebsites = this.authorization.hasPermission('Website.View');
    const canViewMenus = this.authorization.hasPermission('Menu.View');
    const missingRestaurant = !this.hasRestaurants();

    return [
      {
        id: 'restaurant',
        label: 'Set up a restaurant',
        description: 'Add your restaurant details, location and contact info.',
        icon: 'restaurant',
        route: ['/setup/restaurant'],
        handledByContainer: true
      },
      {
        id: 'website',
        label: 'Customize your website',
        description: 'Pick a template and publish your restaurant site.',
        icon: 'website',
        route: ['/websites/new'],
        disabledReason: missingRestaurant
          ? 'Add a restaurant first.'
          : !canViewWebsites
            ? 'Website access is missing for this workspace.'
            : undefined
      },
      {
        id: 'menu',
        label: 'Manage your menus',
        description: 'Add dishes, categories and prices to your menu.',
        icon: 'menu',
        route: ['/menus'],
        disabledReason: missingRestaurant
          ? 'Add a restaurant first.'
          : !canViewMenus
            ? 'Menu access is missing for this workspace.'
            : undefined
      },
      {
        id: 'workspace',
        label: 'Create a workspace',
        description: 'Add a workspace for another restaurant business.',
        icon: 'workspace',
        route: ['/setup/workspace']
      }
    ];
  });

  protected readonly setupSteps = computed<SetupStep[]>(() => {
    const workspaceReady = this.memberships().length > 0;
    const restaurants = this.restaurants();
    const websites = this.websites();
    const menus = this.menus();
    const subscription = this.subscriptionStatus();

    const steps: SetupStep[] = [
      {
        id: 'workspace',
        title: 'Create your workspace',
        description: workspaceReady
          ? 'Your business hub is set up and ready to use.'
          : 'Set up your organization to get started.',
        status: workspaceReady ? 'completed' : 'current',
        actionLabel: 'Create workspace',
        actionRoute: ['/setup/workspace']
      },
      {
        id: 'subscription',
        title: 'Activate your workspace',
        description: subscription.detail,
        status: this.resolveSubscriptionStepStatus(subscription),
        actionLabel: subscription.canStartTrial
          ? 'Start free trial'
          : 'Choose a plan'
      },
      {
        id: 'restaurant',
        title: 'Add your first restaurant',
        description: 'Add your restaurant name, location and business details.',
        status: this.resolveStatus(restaurants, true),
        actionLabel: 'Start',
        actionRoute: ['/setup/restaurant']
      },
      {
        id: 'website',
        title: 'Customize your website',
        description: 'Choose a look that reflects your restaurant identity.',
        status: this.resolveStatus(websites, this.hasRestaurants()),
        actionLabel: 'Build',
        actionRoute: ['/websites/new']
      },
      {
        id: 'menu',
        title: 'Build your menu',
        description: 'Add your dishes, descriptions and prices.',
        status: this.resolveStatus(menus, this.hasRestaurants()),
        actionLabel: 'Add dishes',
        actionRoute: ['/menus']
      }
    ];

    return this.withSingleCurrentStep(steps);
  });

  constructor() {
    toObservable(this.tenantContext.activeTenantId)
      .pipe(takeUntilDestroyed())
      .subscribe(tenantId => this.loadSnapshot(tenantId));

    // (Re)load order-scoped data whenever the active restaurant or the date
    // range changes. Stale responses from a previous restaurant/range are
    // ignored by loadOrderData's request-sequence guard.
    toObservable(this.activeRestaurant)
      .pipe(takeUntilDestroyed())
      .subscribe(restaurant =>
        this.loadOrderData(restaurant?.id ?? null)
      );

    toObservable(this.dateRange)
      .pipe(takeUntilDestroyed())
      .subscribe(() =>
        this.loadOrderData(this.activeRestaurant()?.id ?? null)
      );

    toObservable(this.customStart)
      .pipe(takeUntilDestroyed())
      .subscribe(() =>
        this.loadOrderData(this.activeRestaurant()?.id ?? null)
      );

    toObservable(this.customEnd)
      .pipe(takeUntilDestroyed())
      .subscribe(() =>
        this.loadOrderData(this.activeRestaurant()?.id ?? null)
      );

    // The trial activation changes what the workspace is allowed to do, so the
    // dashboard data is read again once the backend accepted it.
    this.subscriptionFlow.trialActivated
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.reload());
  }

  /**
   * Opens the restaurant setup when the workspace is entitled to use it and
   * opens the shared subscription experience otherwise.
   *
   * The decision is made from the verified backend state. While the state is
   * still unknown the user is sent to the setup page, which reports the
   * access problem itself if the workspace is not entitled.
   */
  protected createRestaurant(): void {
    const state = this.subscriptionState();

    if (state && !this.subscriptionFlow.canUseProtectedFeatures(state)) {
      this.openSubscription('Adding a restaurant needs an active workspace subscription.');

      return;
    }

    void this.router.navigate(['/setup/restaurant']);
  }

  protected createWorkspace(): void {
    void this.router.navigate(['/setup/workspace']);
  }

  protected onQuickAction(action: QuickAction): void {
    if (action.id === 'restaurant') {
      this.createRestaurant();
    }
  }

  protected onStepAction(step: SetupStep): void {
    if (step.id === 'subscription') {
      this.openSubscription('Activate your workspace to unlock restaurant setup.');

      return;
    }

    if (step.id === 'restaurant') {
      this.createRestaurant();

      return;
    }

    const route = step.actionRoute;

    if (!route) {
      return;
    }

    void this.router.navigate(route);
  }

  protected openSubscription(reason: string): void {
    this.subscriptionFlow.open(reason);
  }

  protected startTrial(): void {
    this.subscriptionFlow.startTrial();
  }

  protected viewPlans(): void {
    this.subscriptionFlow.viewPlans();
  }

  protected closeSubscription(): void {
    this.subscriptionFlow.close();
  }

  protected selectTenant(tenantId: string): void {
    if (this.switching()) {
      return;
    }

    this.switchError.set(null);

    this.tenantContext.switchAndRefresh(tenantId).subscribe({
      next: response => {
        if (!response?.success || !response.data) {
          const message =
            response?.message ?? 'Unable to switch workspace. Please try again.';

          this.switchError.set(message);
          this.notificationService.error(message);
        }
      },
      error: () => {
        const message = 'Unable to switch workspace. Please try again.';

        this.switchError.set(message);
        this.notificationService.error(message);
      }
    });
  }

  protected retry(): void {
    this.reload();
  }

  private reload(): void {
    this.loadedTenantId = null;
    this.loadSnapshot(this.tenantContext.activeTenantId());
  }

  /**
   * Derives the checklist state of the subscription step from the verified
   * subscription state.
   */
  private resolveSubscriptionStepStatus(
    subscription: ResolvedSubscriptionStatus
  ): SetupStep['status'] {
    if (subscription.kind === 'unavailable') {
      return 'unavailable';
    }

    if (subscription.canUseProtectedFeatures) {
      return 'completed';
    }

    if (subscription.canStartTrial) {
      return 'current';
    }

    return 'upcoming';
  }

  private loadSnapshot(tenantId: string | null): void {
    if (tenantId === null) {
      this.loadedTenantId = null;
      this.snapshot.set(null);
      this.snapshotLoading.set(false);
      this.snapshotError.set(null);
      return;
    }

    if (tenantId === this.loadedTenantId) {
      return;
    }

    this.loadedTenantId = tenantId;
    const requestId = ++this.requestSequence;

    this.snapshot.set(null);
    this.snapshotLoading.set(true);
    this.snapshotError.set(null);

    this.dashboardService
      .loadSnapshot()
      .pipe(
        finalize(() => {
          if (this.isCurrent(requestId, tenantId)) {
            this.snapshotLoading.set(false);
          }
        })
      )
      .subscribe({
        next: snapshot => {
          if (!this.isCurrent(requestId, tenantId)) {
            return;
          }

          this.snapshot.set(snapshot);
        },
        error: () => {
          if (!this.isCurrent(requestId, tenantId)) {
            return;
          }

          const message =
            'We could not load your workspace data. Please try again.';

          this.snapshotError.set(message);
          this.notificationService.error(message);
        }
      });
  }

  private isCurrent(requestId: number, tenantId: string): boolean {
    return (
      requestId === this.requestSequence &&
      this.tenantContext.activeTenantId() === tenantId
    );
  }

  /**
   * Loads order-scoped data (summary, trend, recent orders) for a restaurant
   * and date range. Each source degrades independently, so one failing
   * endpoint never blanks the whole section.
   */
  private loadOrderData(restaurantId: string | null): void {
    if (restaurantId === null) {
      this.loadedRequestKey = null;
      this.orderSummary.set(null);
      this.orderSummaryLoading.set(false);
      this.orderSummaryError.set(null);
      this.orderAnalytics.set(null);
      this.orderAnalyticsLoading.set(false);
      this.orderAnalyticsError.set(null);
      this.recentOrders.set(null);
      this.recentOrdersLoading.set(false);
      this.recentOrdersError.set(null);
      return;
    }

    const start = this.startDate();
    const end = this.endDate();
    const key = `${restaurantId}|${start}|${end}`;

    if (key === this.loadedRequestKey) {
      return;
    }

    this.loadedRequestKey = key;
    const requestId = ++this.orderRequestSequence;

    this.orderSummary.set(null);
    this.orderSummaryLoading.set(true);
    this.orderSummaryError.set(null);
    this.orderAnalytics.set(null);
    this.orderAnalyticsLoading.set(true);
    this.orderAnalyticsError.set(null);
    this.recentOrders.set(null);
    this.recentOrdersLoading.set(true);
    this.recentOrdersError.set(null);

    this.requestOrder(
      requestId,
      this.orderApi.getStaffOrderSummary(restaurantId, start, end),
      value => this.orderSummary.set(value),
      loading => this.orderSummaryLoading.set(loading),
      message => this.orderSummaryError.set(message)
    );

    this.requestOrder(
      requestId,
      this.orderApi.getStaffOrderAnalytics(restaurantId, start, end),
      value => this.orderAnalytics.set(value),
      loading => this.orderAnalyticsLoading.set(loading),
      message => this.orderAnalyticsError.set(message)
    );

    this.requestOrder(
      requestId,
      this.orderApi.getStaffOrders(restaurantId, null, null, 1, 8),
      value => this.recentOrders.set(value?.items ?? null),
      loading => this.recentOrdersLoading.set(loading),
      message => this.recentOrdersError.set(message)
    );
  }

  /** Retries the last order-data load for the active restaurant and range. */
  protected retryOrders(): void {
    this.loadOrderData(this.activeRestaurant()?.id ?? null);
  }

  private requestOrder<T>(
    requestId: number,
    source: Observable<ApiResponse<T>>,
    setValue: (value: T | null) => void,
    setLoading: (loading: boolean) => void,
    setError: (message: string | null) => void
  ): void {
    source
      .pipe(finalize(() => {
        if (requestId === this.orderRequestSequence) {
          setLoading(false);
        }
      }))
      .subscribe({
        next: response => {
          if (requestId !== this.orderRequestSequence) {
            return;
          }

          setValue(response.data ?? null);
        },
        error: () => {
          if (requestId !== this.orderRequestSequence) {
            return;
          }

          const message = 'We could not load this data. Please try again.';
          setError(message);
          this.notificationService.error(message);
        }
      });
  }

  protected refresh(): void {
    this.loadedRequestKey = null;
    this.loadOrderData(this.activeRestaurant()?.id ?? null);
  }

  protected selectDateRange(
    id: 'today' | '7days' | '30days' | 'month' | 'custom'
  ): void {
    this.dateRange.set(id);
  }

  protected onCustomStart(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.customStart.set(input?.value ?? null);
  }

  protected onCustomEnd(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.customEnd.set(input?.value ?? null);
  }

  protected readonly greeting = computed(() => {
    const hour = new Date().getHours();

    if (hour < 12) {
      return 'Good morning';
    }

    if (hour < 17) {
      return 'Good afternoon';
    }

    return 'Good evening';
  });

  protected readonly restaurantSubtitle = (restaurant: RestaurantDto): string => {
    const parts = [restaurant.city, restaurant.country].filter(
      part => typeof part === 'string' && part.trim().length > 0
    );
    const location = parts.join(', ');
    const today = new Date().toLocaleDateString('en-PK', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
    return location
      ? `${location} · ${restaurant.status} · ${today}`
      : `${restaurant.status} · ${today}`;
  };

  protected restaurantStatusBadge(restaurant: RestaurantDto): string {
    return restaurant.status;
  };

  protected formatMoney(amount: number, currency: string | null): string {
    return formatMoney(amount, currency);
  }

  protected pct(value: number, max: number): number {
    if (!max || max <= 0) {
      return 0;
    }

    return Math.round((value / max) * 100);
  }

  protected readonly maxRevenue = computed(() => {
    const daily = this.orderAnalytics()?.daily ?? [];

    return daily.reduce((m, d) => Math.max(m, d.revenue), 0);
  });

  protected readonly maxOrderCount = computed(() => {
    const daily = this.orderAnalytics()?.daily ?? [];

    return daily.reduce((m, d) => Math.max(m, d.orderCount), 0);
  });

  protected readonly orderMetrics = computed<DashboardMetric[]>(() => {
    const summary = this.orderSummary();
    const status: DashboardMetricStatus = this.orderSummaryLoading()
      ? 'loading'
      : this.orderSummaryError()
        ? 'unavailable'
        : 'ready';

    const money = (value: number) =>
      formatMoney(value, summary?.currency ?? null);

    const metrics: DashboardMetric[] = [];

    metrics.push({
      id: 'total-orders',
      label: 'Total Orders',
      value: summary ? String(summary.totalOrders) : '—',
      hint: 'All orders in the selected period',
      icon: 'orders',
      status
    });

    if (this.canViewRevenue()) {
      metrics.push({
        id: 'total-revenue',
        label: 'Total Revenue',
        value: summary ? money(summary.totalRevenue) : '—',
        hint: 'Completed orders only',
        icon: 'revenue',
        status
      });

      metrics.push({
        id: 'average-order-value',
        label: 'Average Order Value',
        value: summary ? money(summary.averageOrderValue) : '—',
        hint: 'Revenue ÷ completed orders',
        icon: 'store',
        status
      });
    }

    metrics.push({
      id: 'pending-orders',
      label: 'Pending Orders',
      value: summary ? String(summary.pendingKitchen) : '—',
      hint: 'New, confirmed or preparing',
      icon: 'pending',
      status
    });

    metrics.push({
      id: 'completed-orders',
      label: 'Completed Orders',
      value: summary ? String(summary.completedOrders) : '—',
      hint: 'Fulfilled in the selected period',
      icon: 'completed',
      status
    });

    metrics.push({
      id: 'cancelled-orders',
      label: 'Cancelled Orders',
      value: summary ? String(summary.cancelledOrders) : '—',
      hint: 'Cancelled in the selected period',
      icon: 'cancelled',
      status
    });

    return metrics;
  });

  protected readonly menuMetrics = computed<DashboardMetric[]>(() => {
    const menus = this.menus();
    const status: DashboardMetricStatus = this.snapshotLoading()
      ? 'loading'
      : menus?.status === 'unavailable'
        ? 'unavailable'
        : 'ready';

    return [
      {
        id: 'total-menus',
        label: 'Total Menus',
        value: menus?.status === 'ready' ? String(menus.totalCount) : '—',
        hint: 'Menus for this restaurant',
        icon: 'menu',
        status
      }
    ];
  });

  protected readonly canViewRevenue = computed(() =>
    this.authorization.hasPermission('Restaurant.View')
  );

  protected readonly canViewOrders = computed(() =>
    this.authorization.hasPermission('Order.View')
  );

  protected readonly canViewMenus = computed(() =>
    this.authorization.hasPermission('Menu.View')
  );

  protected readonly canViewSubscription = computed(() =>
    this.authorization.hasPermission('Tenant.View')
  );

  protected readonly canManageRestaurant = computed(() =>
    this.authorization.hasPermission('Restaurant.Update') ||
    this.authorization.hasPermission('Restaurant.Create')
  );

  protected readonly canCreateOrder = computed(() =>
    this.authorization.hasPermission('Order.Create')
  );

  protected readonly canManageWebsite = computed(() =>
    this.authorization.hasPermission('Website.View')
  );

  /** Real operational alerts derived from the loaded data. */
  protected readonly operationalAlerts = computed(() => {
    const alerts: Array<{
      id: string;
      label: string;
      detail: string;
      kind: 'info' | 'warning' | 'danger';
    }> = [];

    const summary = this.orderSummary();
    const restaurant = this.activeRestaurant();
    const subscription = this.subscriptionStatus();

    if (summary) {
      if (summary.cancelledOrders > 0) {
        alerts.push({
          id: 'cancelled-orders',
          label: 'Cancelled orders',
          detail: `${summary.cancelledOrders} order${
            summary.cancelledOrders === 1 ? '' : 's'
          } cancelled in the selected period.`,
          kind: 'warning'
        });
      }

      if (summary.pendingKitchen > 0) {
        alerts.push({
          id: 'pending-kitchen',
          label: 'Orders in the kitchen',
          detail: `${summary.pendingKitchen} order${
            summary.pendingKitchen === 1 ? '' : 's'
          } awaiting attention.`,
          kind: 'info'
        });
      }
    }

    if (subscription.kind === 'expired') {
      alerts.push({
        id: 'subscription-expired',
        label: 'Subscription expired',
        detail: subscription.detail,
        kind: 'danger'
      });
    }

    if (subscription.kind === 'pending') {
      alerts.push({
        id: 'subscription-pending',
        label: 'Workspace pending activation',
        detail: subscription.detail,
        kind: 'warning'
      });
    }

    if (
      restaurant &&
      restaurant.status &&
      restaurant.status.toLowerCase() !== 'active'
    ) {
      alerts.push({
        id: 'restaurant-status',
        label: 'Restaurant not active',
        detail: `The restaurant is currently ${restaurant.status}.`,
        kind: 'warning'
      });
    }

    return alerts;
  });

  /** Role-appropriate quick actions that navigate to existing features. */
  protected readonly operationalQuickActions = computed<QuickAction[]>(() => {
    const restaurantId = this.activeRestaurant()?.id;
    const hasRestaurant = !!restaurantId;

    const actions: QuickAction[] = [];

    actions.push({
      id: 'create-order',
      label: 'Create Order',
      description: 'Take a new order for this restaurant.',
      icon: 'store',
      route: ['/orders/create'],
      disabled: !hasRestaurant || !this.canCreateOrder(),
      disabledReason: !hasRestaurant
        ? 'Select a restaurant first.'
        : !this.canCreateOrder()
          ? 'Order creation is not available to your role.'
          : undefined
    });

    actions.push({
      id: 'view-orders',
      label: 'View Orders',
      description: 'Open the full order management screen.',
      icon: 'orders',
      route: ['/orders'],
      disabled: !hasRestaurant || !this.canViewOrders(),
      disabledReason: !hasRestaurant
        ? 'Select a restaurant first.'
        : 'Order access is not available to your role.'
    });

    actions.push({
      id: 'manage-menu',
      label: 'Manage Menu',
      description: 'Add dishes, categories and prices.',
      icon: 'menu',
      route: ['/menus'],
      disabled: !hasRestaurant || !this.canViewMenus(),
      disabledReason: !hasRestaurant
        ? 'Select a restaurant first.'
        : 'Menu access is not available to your role.'
    });

    if (this.canManageWebsite()) {
      actions.push({
        id: 'manage-website',
        label: 'Manage Website',
        description: 'Create or publish your restaurant website.',
        icon: 'website',
        route: ['/websites'],
        disabled: !hasRestaurant
      });
    }

    if (this.canManageRestaurant()) {
      actions.push({
        id: 'manage-restaurant',
        label: 'Manage Restaurant',
        description: 'Update restaurant details and settings.',
        icon: 'restaurant',
        route: ['/setup/restaurant'],
        disabled: !hasRestaurant
      });
    }

    if (this.canViewSubscription() && this.canManageRestaurant()) {
      actions.push({
        id: 'manage-subscription',
        label: 'Manage Subscription',
        description: 'Review or change the workspace plan.',
        icon: 'wallet',
        route: ['/subscription']
      });
    }

    return actions;
  });

  /**
   * Derives the state of a checklist step from the collection that backs it.
   * Steps whose data cannot be read are reported as unavailable instead of
   * being counted as completed or missing.
   */
  private resolveStatus(
    collection: DashboardCollection<unknown> | null,
    prerequisiteMet: boolean
  ): SetupStep['status'] {
    if (!prerequisiteMet) {
      return 'upcoming';
    }

    if (!collection) {
      return 'upcoming';
    }

    if (collection.status === 'unavailable') {
      return 'unavailable';
    }

    return collection.totalCount > 0 ? 'completed' : 'current';
  }

  private withSingleCurrentStep(steps: SetupStep[]): SetupStep[] {
    let currentAssigned = false;

    return steps.map(step => {
      if (step.status !== 'current') {
        return step;
      }

      if (currentAssigned) {
        return { ...step, status: 'upcoming' };
      }

      currentAssigned = true;

      return step;
    });
  }

  private toMetric(
    id: string,
    label: string,
    icon: DashboardMetricIcon,
    collection: DashboardCollection<unknown> | null,
    emptyHint: string
  ): DashboardMetric {
    if (!collection) {
      return {
        id,
        label,
        value: '—',
        hint: 'Loading…',
        icon,
        status: 'loading'
      };
    }

    if (collection.status === 'unavailable') {
      return {
        id,
        label,
        value: '—',
        hint: 'Not available right now',
        icon,
        status: 'unavailable'
      };
    }

    return {
      id,
      label,
      value: String(collection.totalCount),
      hint: collection.totalCount === 0 ? emptyHint : 'In your workspace',
      icon,
      status: 'ready'
    };
  }
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Formats a monetary amount for display. The currency reported by the
 * backend is honoured; PKR is the Resto.pk default when no currency is
 * available.
 */
function formatMoney(amount: number, currency: string | null): string {
  const code = currency || 'PKR';

  try {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 2
    }).format(amount);
  } catch {
    return `${amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })} ${code}`;
  }
}
