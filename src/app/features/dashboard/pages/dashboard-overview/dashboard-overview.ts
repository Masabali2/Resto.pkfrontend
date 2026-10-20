import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { RestaurantService } from '../../../websites/services/restaurant.service';
import { WebsiteService } from '../../../websites/services/website.service';
import { StaffService } from '../../../staff/services/staff.service';
import { HttpErrorHandlerService } from '../../../../core/services/http-error-handler.service';
import { AuthStateService } from '../../../../core/services/auth-state.service';
import { AuthorizationService } from '../../../../core/services/authorization.service';
import { Button } from '../../../../shared/components/button/button';
import { LoadingSpinner } from '../../../../shared/components/loading-spinner/loading-spinner';
import type { ApiResponse } from '../../../../core/models/api-response.model';
import type { RestaurantsPage } from '../../../websites/models/restaurant.model';
import type { WebsitesPage } from '../../../websites/models/website.model';
import type { StaffPage } from '../../../staff/services/staff.service';

type SectionState = 'loading' | 'ready' | 'error';

interface NextAction {
  label: string;
  description: string;
  route: readonly string[];
  iconPath: string;
}

@Component({
  selector: 'app-dashboard-overview',
  standalone: true,
  imports: [RouterLink, Button, LoadingSpinner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard-overview.html',
  styleUrl: './dashboard-overview.css'
})
export class DashboardOverview {
  private readonly authState = inject(AuthStateService);
  private readonly authorization = inject(AuthorizationService);
  private readonly restaurantService = inject(RestaurantService);
  private readonly websiteService = inject(WebsiteService);
  private readonly staffService = inject(StaffService);
  private readonly httpErrorHandler = inject(HttpErrorHandlerService);

  protected readonly workspaceState = signal<SectionState>('loading');
  protected readonly workspaceError = signal('');
  protected readonly hasRestaurant = signal(false);
  protected readonly restaurantCount = signal(0);

  protected readonly websitesState = signal<SectionState>('loading');
  protected readonly websitesError = signal('');
  protected readonly websiteCount = signal(0);
  protected readonly publishedWebsiteCount = signal(0);

  protected readonly staffState = signal<SectionState>('loading');
  protected readonly staffError = signal('');
  protected readonly staffCount = signal(0);

  protected readonly greetingName = computed(
    () => this.authState.authResult()?.user?.userName ?? 'there'
  );

  protected readonly activeTenantName = computed(
    () => this.authState.authResult()?.activeTenant?.name ?? null
  );

  protected readonly canViewRestaurants = computed(() =>
    this.authorization.hasPermission('Restaurant.View')
  );

  protected readonly canCreateRestaurant = computed(() =>
    this.authorization.hasPermission('Restaurant.Create')
  );

  protected readonly canViewWebsites = computed(() =>
    this.authorization.hasPermission('Website.View')
  );

  protected readonly canViewStaff = computed(() =>
    this.authorization.hasPermission('Staff.View')
  );

  protected readonly nextActions = computed<NextAction[]>(() => {
    const actions: NextAction[] = [];

    if (this.workspaceState() === 'ready' && !this.hasRestaurant()) {
      actions.push({
        label: 'Create your first restaurant',
        description: 'Set up your restaurant profile to unlock the dashboard.',
        route: ['/setup/restaurant'],
        iconPath: 'M12 3 3 8v13h6v-6h6v6h6V8l-9-5Z'
      });

      return actions;
    }

    if (this.hasRestaurant() && this.websitesState() === 'ready' && this.websiteCount() === 0) {
      actions.push({
        label: 'Build your public website',
        description: 'Turn your restaurant into a live site with Resto.pk templates.',
        route: ['/websites/new'],
        iconPath: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 2c1.6 0 3 2.7 3 6s-1.4 6-3 6-3-2.7-3-6 1.4-6 3-6ZM5 9h14M5 15h14'
      });
    }

    if (this.hasRestaurant() && this.staffState() === 'ready' && this.staffCount() <= 1) {
      actions.push({
        label: 'Invite your team',
        description: 'Add managers and staff so your restaurant can take orders.',
        route: ['/staff'],
        iconPath: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-6 9a6 6 0 0 1 12 0M17 4a3 3 0 1 1 0 6m1 10a5.5 5.5 0 0 0-3-4.9'
      });
    }

    return actions;
  });

  constructor() {
    this.loadWorkspace();
  }

  protected loadWorkspace(): void {
    this.loadRestaurants();
    this.loadWebsites();
    this.loadStaff();
  }

  private loadRestaurants(): void {
    this.workspaceState.set('loading');
    this.workspaceError.set('');

    this.restaurantService.getRestaurants(1, 1).subscribe({
      next: (response: ApiResponse<RestaurantsPage>) => {
        if (!response.success || !response.data) {
          this.workspaceError.set(
            response.message ?? 'Unable to load your restaurants. Please try again.'
          );
          this.workspaceState.set('error');
          return;
        }

        this.restaurantCount.set(response.data.totalCount);
        this.hasRestaurant.set(response.data.totalCount > 0);
        this.workspaceState.set('ready');
      },
      error: (error: unknown) => {
        this.workspaceError.set(
          this.httpErrorHandler.handle(error, {
            unauthorizedMessage: 'Your session has expired. Please sign in again.',
            fallbackMessage: 'Unable to load your restaurants. Please try again.'
          }).message
        );
        this.workspaceState.set('error');
      }
    });
  }

  private loadWebsites(): void {
    if (!this.canViewWebsites()) {
      this.websitesState.set('ready');
      return;
    }

    this.websitesState.set('loading');
    this.websitesError.set('');

    this.websiteService.getWebsites(1, 1).subscribe({
      next: (response: ApiResponse<WebsitesPage>) => {
        if (!response.success || !response.data) {
          this.websitesError.set(
            response.message ?? 'Unable to load your websites. Please try again.'
          );
          this.websitesState.set('error');
          return;
        }

        this.websiteCount.set(response.data.totalCount);
        this.publishedWebsiteCount.set(
          response.data.items.filter(w => w.isPublished).length
        );
        this.websitesState.set('ready');
      },
      error: (error: unknown) => {
        this.websitesError.set(
          this.httpErrorHandler.handle(error, {
            unauthorizedMessage: 'Your session has expired. Please sign in again.',
            fallbackMessage: 'Unable to load your websites. Please try again.'
          }).message
        );
        this.websitesState.set('error');
      }
    });
  }

  private loadStaff(): void {
    if (!this.canViewStaff()) {
      this.staffState.set('ready');
      return;
    }

    this.staffState.set('loading');
    this.staffError.set('');

    this.staffService.getStaff(1, 1).subscribe({
      next: (response: ApiResponse<StaffPage>) => {
        if (!response.success || !response.data) {
          this.staffError.set(
            response.message ?? 'Unable to load your team. Please try again.'
          );
          this.staffState.set('error');
          return;
        }

        this.staffCount.set(response.data.totalCount);
        this.staffState.set('ready');
      },
      error: (error: unknown) => {
        this.staffError.set(
          this.httpErrorHandler.handle(error, {
            unauthorizedMessage: 'Your session has expired. Please sign in again.',
            fallbackMessage: 'Unable to load your team. Please try again.'
          }).message
        );
        this.staffState.set('error');
      }
    });
  }

  protected retryRestaurants(): void {
    this.loadRestaurants();
  }

  protected retryWebsites(): void {
    this.loadWebsites();
  }

  protected retryStaff(): void {
    this.loadStaff();
  }
}
