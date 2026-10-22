import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import {
  LucideBuilding2,
  LucideUser,
  LucideUsers
} from '@lucide/angular';
import { TenantSelector } from '../../../../shared/components/tenant-selector/tenant-selector';
import type { TenantSummary } from '../../../../core/models/auth.model';

/**
 * Shows the workspace the account is currently working in.
 *
 * The active tenant is passed in by the dashboard container, which reads it
 * from the shared tenant context. Switching is delegated to the existing
 * `app-tenant-selector`, so the dashboard never keeps a second tenant state.
 */
@Component({
  selector: 'app-workspace-overview',
  standalone: true,
  imports: [TenantSelector, LucideBuilding2, LucideUser, LucideUsers],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './workspace-overview.html',
  styleUrl: './workspace-overview.css'
})
export class WorkspaceOverview {
  readonly tenant = input<TenantSummary | null>(null);
  readonly membershipCount = input(0);
}
