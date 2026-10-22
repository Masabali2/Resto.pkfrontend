import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal
} from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { LucidePlus } from '@lucide/angular';
import { AuthStateService } from '../../../../core/services/auth-state.service';
import { AuthorizationService } from '../../../../core/services/authorization.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { TenantContextService } from '../../../../core/services/tenant-context.service';
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
  DashboardMetricIcon
} from '../../models/dashboard-metric.model';
import type {
  DashboardCollection,
  DashboardSnapshot
} from '../../models/dashboard-snapshot.model';
import type { QuickAction } from '../../models/quick-action.model';
import type { SetupStep } from '../../models/setup-step.model';

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
    LucidePlus,
    OnboardingHighlights,
    OnboardingWelcome,
    OnboardingWorkspacePrompt,
    QuickActions,
    RestaurantOverview,
    SetupProgress,
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

  protected readonly memberships = computed(
    () => this.authState.authResult()?.memberships ?? []
  );

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
        route: ['/setup/restaurant']
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
  }

  protected createRestaurant(): void {
    void this.router.navigate(['/setup/restaurant']);
  }

  protected createWorkspace(): void {
    void this.router.navigate(['/setup/workspace']);
  }

  protected onStepAction(step: SetupStep): void {
    const route = step.actionRoute;

    if (!route) {
      return;
    }

    void this.router.navigate(route);
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
    this.loadedTenantId = null;
    this.loadSnapshot(this.tenantContext.activeTenantId());
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
