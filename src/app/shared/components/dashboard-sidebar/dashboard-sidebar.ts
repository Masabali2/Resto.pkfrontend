import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthorizationService } from '../../../core/services/authorization.service';
import {
  DASHBOARD_NAVIGATION,
  type DashboardNavGroup
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

  readonly navigateRequested = output<void>();

  protected readonly navGroups = computed<readonly DashboardNavGroup[]>(() =>
    DASHBOARD_NAVIGATION.map(group => ({
      ...group,
      items: group.items.filter(item => this.isItemVisible(item))
    }))
      .filter(group => group.items.length > 0)
  );

  private isItemVisible(
    item: DashboardNavGroup['items'][number]
  ): boolean {
    if (item.requiredPermissions && item.requiredPermissions.length > 0) {
      return this.authorization.hasPermissions(
        item.requiredPermissions,
        item.permissionMode ?? 'all'
      );
    }

    return true;
  }
}
