import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthorizationService } from '../../../core/services/authorization.service';
import { TenantContextService } from '../../../core/services/tenant-context.service';
import {
  DASHBOARD_NAVIGATION,
  type DashboardNavGroup,
  type DashboardNavItem
} from './dashboard-navigation';

@Component({
  selector: 'app-dashboard-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard-sidebar.html',
  styleUrl: './dashboard-sidebar.css'
})
export class DashboardSidebar {
  private readonly authorization = inject(AuthorizationService);
  private readonly tenantContext = inject(TenantContextService);

  readonly navigateRequested = output<void>();

  protected readonly navGroups = computed<readonly DashboardNavGroup[]>(() =>
    DASHBOARD_NAVIGATION.map(group => ({
      ...group,
      items: group.items.filter(item => this.isItemVisible(item))
    }))
      .filter(group => group.items.length > 0)
  );

  private isItemVisible(
    item: DashboardNavItem
  ): boolean {
    if (item.requiredPermissions && item.requiredPermissions.length > 0) {
      const granted = this.authorization.hasPermissions(
        item.requiredPermissions,
        item.permissionMode ?? 'all'
      );

      if (granted) {
        return true;
      }

      // Restaurant.View is granted by the backend only once an active
      // restaurant exists in the tenant. Members of a tenant without one
      // still need the entry point so they can reach the setup journey;
      // the backend remains the authority for every API call.
      return item.setupRoute !== undefined &&
        this.tenantContext.activeTenantId() !== null;
    }

    return true;
  }
}
