import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  signal
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-dashboard-header',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard-header.html',
  styleUrl: './dashboard-header.css'
})
export class DashboardHeader {
  private readonly authState = inject(AuthStateService);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);

  readonly toggleSidebar = output<void>();

  protected readonly accountOpen = signal(false);
  protected readonly signingOut = signal(false);

  protected readonly userName = computed(() => {
    const user = this.authState.authResult()?.user;
    return user?.userName || user?.email || 'Account';
  });

  protected readonly userEmail = computed(
    () => this.authState.authResult()?.user?.email ?? ''
  );

  protected readonly initials = computed(() => {
    const name = this.userName();
    const letters = name
      .split(/[\s@._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part.charAt(0).toUpperCase())
      .join('');
    return letters || 'R';
  });

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

  protected signOut(): void {
    if (this.signingOut()) {
      return;
    }

    this.signingOut.set(true);
    this.closeAccount();

    this.authService.logout().subscribe({
      next: () => this.completeSignOut(),
      error: () => this.completeSignOut()
    });
  }

  private completeSignOut(): void {
    this.authState.clearAuthState();
    this.notificationService.info('You have been signed out.');
    void this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}
