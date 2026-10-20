import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal
} from '@angular/core';
import { TenantContextService } from '../../../core/services/tenant-context.service';
import { NotificationService } from '../../../core/services/notification.service';
import { HttpErrorHandlerService } from '../../../core/services/http-error-handler.service';

@Component({
  selector: 'app-tenant-selector',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tenant-selector.html',
  styleUrl: './tenant-selector.css'
})
export class TenantSelector {
  private readonly tenantContext = inject(TenantContextService);
  private readonly notificationService = inject(NotificationService);
  private readonly httpErrorHandler = inject(HttpErrorHandlerService);

  protected readonly open = signal(false);
  protected readonly switching = signal(false);

  protected readonly memberships = this.tenantContext.memberships;
  protected readonly activeTenantId = this.tenantContext.activeTenantId;

  protected readonly visible = computed(() => this.tenantContext.canSwitchTenants());

  protected readonly activeTenantLabel = computed(() => {
    const id = this.activeTenantId();
    const tenant = this.memberships().find(m => m.tenantId === id);
    return tenant?.name ?? 'Select workspace';
  });

  protected toggle(): void {
    this.open.update(value => !value);
  }

  protected close(): void {
    this.open.set(false);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
    }
  }

  protected switchTo(tenantId: string): void {
    if (this.switching() || tenantId === this.activeTenantId()) {
      this.close();
      return;
    }

    this.switching.set(true);
    this.close();

    this.tenantContext.switchTenant(tenantId).subscribe({
      next: response => {
        this.switching.set(false);

        if (!response.success || !response.data) {
          this.notificationService.error(
            response.message ?? 'Unable to switch workspace. Please try again.'
          );
          return;
        }

        this.tenantContext.refreshSession().subscribe(refresh => {
          if (!refresh.success || !refresh.data) {
            this.notificationService.error(
              refresh.message ?? 'Workspace switched, but permissions could not be refreshed.'
            );
          }
        });
      },
      error: (error: unknown) => {
        this.switching.set(false);
        this.notificationService.error(
          this.httpErrorHandler.handle(error, {
            unauthorizedMessage: 'Your session has expired. Please sign in again.',
            fallbackMessage: 'Unable to switch workspace. Please try again.'
          }).message
        );
      }
    });
  }
}
