import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Page level heading of the dashboard: eyebrow, title, supporting copy and an
 * optional status badge. The action area is a named slot so the container can
 * inject its own controls without duplicating the header markup.
 *
 * This is the in-page heading — it is not the authenticated navbar, which is
 * owned by SharedLayout.
 */
@Component({
  selector: 'app-dashboard-page-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard-page-header.html',
  styleUrl: './dashboard-page-header.css'
})
export class DashboardPageHeader {
  readonly eyebrow = input<string | null>(null);
  readonly title = input('');
  readonly subtitle = input<string | null>(null);
  readonly badge = input<string | null>(null);
}
