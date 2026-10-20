import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
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
  protected readonly navGroups: readonly DashboardNavGroup[] = DASHBOARD_NAVIGATION;

  readonly navigateRequested = output<void>();
}
