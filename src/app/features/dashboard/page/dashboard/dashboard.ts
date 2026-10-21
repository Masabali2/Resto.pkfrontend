import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal
} from '@angular/core';
import { Router } from '@angular/router';
import { AuthStateService } from '../../../../core/services/auth-state.service';
import { TenantContextService } from '../../../../core/services/tenant-context.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard {
  private readonly router = inject(Router);
  private readonly authState = inject(AuthStateService);
  private readonly tenantContext = inject(TenantContextService);

  readonly authResult = this.authState.authResult;

  readonly activeTenant = computed(
    () => this.authResult()?.activeTenant ?? null
  );

  readonly memberships = computed(
    () => this.authResult()?.memberships ?? []
  );

  readonly switching = this.tenantContext.switching;
  readonly switchError = signal<string | null>(null);

  readonly pageState = computed(() => {
    if (!this.authResult()) {
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

  createRestaurant(): void {
    void this.router.navigate(['/setup/restaurant']);
  }

  selectTenant(tenantId: string): void {
    if (this.switching()) {
      return;
    }

    this.switchError.set(null);

    this.tenantContext.switchAndRefresh(tenantId).subscribe({
      next: response => {
        if (!response?.success || !response.data) {
          this.switchError.set(
            response?.message ?? 'Unable to switch workspace. Please try again.'
          );
        }
      },
      error: () => {
        this.switchError.set(
          'Unable to switch workspace. Please try again.'
        );
      }
    });
  }
}