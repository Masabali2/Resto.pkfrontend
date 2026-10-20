import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthorizationService } from '../../../services/authorization.service';
import { TenantContextService } from '../../../services/tenant-context.service';
import {
  SIDEBAR_NAVIGATION,
  type SidebarNavGroup,
  type SidebarNavItem
} from './sidebar-navigation';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css'
})
export class Sidebar {
  private readonly authorization = inject(AuthorizationService);
  private readonly tenantContext = inject(TenantContextService);

  readonly collapsed = input(false);
  readonly mobileOpen = input(false);
  readonly collapseToggle = output<void>();
  readonly closeMobile = output<void>();

  protected readonly navGroups = computed<readonly SidebarNavGroup[]>(() =>
    SIDEBAR_NAVIGATION.map(group => ({
      ...group,
      items: group.items.filter(item => this.isItemVisible(item))
    })).filter(group => group.items.length > 0)
  );

  protected readonly exactMatchOptions = { exact: true };

  protected onEscapeKey(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.mobileOpen()) {
      this.closeMobile.emit();
    }
  }

  private isItemVisible(item: SidebarNavItem): boolean {
    if (!item.requiredPermissions || item.requiredPermissions.length === 0) {
      return true;
    }

    if (this.authorization.hasPermissions(item.requiredPermissions, item.permissionMode ?? 'all')) {
      return true;
    }

    // Restaurant.View is granted by the backend only once an active
    // restaurant exists in the tenant. Members of a tenant without one still
    // need the entry point so they can reach the setup journey; without an
    // active tenant no tenant-scoped item is shown.
    return item.setupRoute !== undefined && this.tenantContext.activeTenantId() !== null;
  }
}
