
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  signal
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';
import { AuthStateService } from '../../../services/auth-state.service';
import { AuthService } from '../../../services/auth.service';
import { NotificationService } from '../../../services/notification.service';
import { AuthorizationService } from '../../../services/authorization.service';
import { ActiveRestaurantStateService } from '../../../services/active-restaurant-state.service';
import { RestaurantContext } from './restaurant-context/restaurant-context';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RestaurantContext],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class Navbar {
  private readonly authState = inject(AuthStateService);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly authorization = inject(AuthorizationService);
  private readonly router = inject(Router);

  /**
   * Shared state of the restaurant the user is working with. The navbar owns
   * no restaurant of its own: it only renders what this service resolved for
   * the active tenant.
   */
  protected readonly activeRestaurant = inject(ActiveRestaurantStateService);

  readonly menuClick = output<void>();
  readonly globalSearch = output<string>();

  protected readonly accountOpen = signal(false);
  protected readonly signingOut = signal(false);
  protected readonly searchQuery = signal('');

  protected readonly restaurant = this.activeRestaurant.restaurant;
  protected readonly restaurants = this.activeRestaurant.restaurants;
  protected readonly restaurantState = this.activeRestaurant.state;
  protected readonly restaurantLoading = this.activeRestaurant.loading;
  protected readonly restaurantError = this.activeRestaurant.errorMessage;

  protected readonly user = computed(
    () => this.authState.authResult()?.user ?? null
  );

  protected readonly activeTenantName = computed(
    () => this.authState.authResult()?.activeTenant?.name ?? null
  );

  /** The restaurant card only exists for an active tenant. */
  protected readonly hasActiveTenant = computed(
    () => this.authState.authResult()?.activeTenant != null
  );

  protected readonly canCreateRestaurant = computed(() =>
    this.authorization.hasPermission('Restaurant.Create')
  );

  protected readonly displayName = computed(() => {
    const user = this.user();
    return user?.userName || user?.email || 'Account';
  });

  protected readonly userEmail = computed(() => this.user()?.email ?? '');

  protected readonly primaryRole = computed(() => {
    const roles = this.user()?.platformRoles ?? [];
    return roles.length > 0 ? roles[0] : null;
  });

  protected readonly initials = computed(() => {
    const name = this.displayName();
    const letters = name
      .split(/[\s@._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part.charAt(0).toUpperCase())
      .join('');

    return letters || 'R';
  });

  protected toggleMenu(): void {
    this.menuClick.emit();
  }

  /** Moves the restaurant selection inside the active tenant. */
  protected onRestaurantSelected(restaurantId: string): void {
    this.activeRestaurant.selectRestaurant(restaurantId);
  }

  /** Reads the restaurants of the active tenant again. */
  protected retryRestaurant(): void {
    this.activeRestaurant.refresh();
  }

  protected toggleAccount(): void {
    this.accountOpen.update(open => !open);
  }

  protected closeAccount(): void {
    this.accountOpen.set(false);
  }

  protected onAccountKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeAccount();
    }
  }

  protected onSearchInput(value: string): void {
    this.searchQuery.set(value);
  }

  protected submitSearch(event: SubmitEvent): void {
    event.preventDefault();

    const query = this.searchQuery().trim();

    if (!query) {
      return;
    }

    this.globalSearch.emit(query);
  }

  protected clearSearch(): void {
    this.searchQuery.set('');
  }

  protected openProfileSettings(): void {
    this.closeAccount();
    void this.router.navigateByUrl('/settings/profile');
  }

  protected openSettings(): void {
    this.closeAccount();
    void this.router.navigateByUrl('/settings');
  }

  protected signOut(): void {
    if (this.signingOut()) {
      return;
    }

    this.signingOut.set(true);
    this.closeAccount();

    this.authService
      .logout()
      .pipe(
        catchError(() => {
          this.notificationService.error(
            'We could not reach the server to sign you out. Your session was ended locally.'
          );
          return of(null);
        }),
        finalize(() => this.completeSignOut())
      )
      .subscribe();
  }

  private completeSignOut(): void {
    this.signingOut.set(false);
    this.authState.clearAuthState();
    void this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}
