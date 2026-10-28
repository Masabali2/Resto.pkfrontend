import {
  Component,
  computed,
  inject,
  signal
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Button } from '../../../../shared/components/button/button';
import { AuthStateService } from '../../../../core/services/auth-state.service';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { catchError, finalize, of } from 'rxjs';

interface NavLink {
  label: string;
  anchor: string;
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, Button],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class Navbar {
  private readonly authState = inject(AuthStateService);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);

  readonly navLinks: NavLink[] = [
    { label: 'Templates', anchor: 'templates' },
    { label: 'Features', anchor: 'features' },
    { label: 'How It Works', anchor: 'how-it-works' },
    { label: 'Pricing', anchor: 'pricing' }
  ];

  readonly mobileMenuOpen = signal(false);
  readonly profileMenuOpen = signal(false);

  readonly isAuthenticated = computed(
    () => this.authState.isAuthenticated()
  );

  readonly user = computed(() => this.authState.authResult()?.user ?? null);

  readonly userName = computed<string>(() => {
    const user = this.user();
    return user?.userName || user?.email || 'Account';
  });

  readonly userEmail = computed<string>(() => this.user()?.email ?? '');

  readonly initials = computed<string>(() => {
    const name = this.userName();
    const letters = name
      .split(/[\s@._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part.charAt(0).toUpperCase())
      .join('');

    return letters || 'R';
  });

  /** Avatar URL from the authenticated user, if available. */
  readonly avatarUrl = computed<string | null>(() => {
    const user = this.user();
    if (!user) {
      return null;
    }

    const withAvatar = user as unknown as { profileImageUrl?: string | null };
    return withAvatar.profileImageUrl ?? null;
  });

  readonly isInitialized = computed(() => this.authState.isInitialized());

  readonly signingOut = signal(false);

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update(open => !open);
    if (this.mobileMenuOpen()) {
      this.profileMenuOpen.set(false);
    }
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  toggleProfileMenu(): void {
    this.profileMenuOpen.update(open => !open);
  }

  closeProfileMenu(): void {
    this.profileMenuOpen.set(false);
  }

  protected goToDashboard(): void {
    this.closeProfileMenu();
    void this.router.navigateByUrl('/dashboard', { replaceUrl: false });
  }

  protected signOut(): void {
    if (this.signingOut()) {
      return;
    }

    this.signingOut.set(true);
    this.closeProfileMenu();

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
