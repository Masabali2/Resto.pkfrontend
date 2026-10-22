import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { LucideBuilding2 } from '@lucide/angular';
import { Button } from '../../../../shared/components/button/button';
import { InlineError } from '../../../../shared/components/inline-error/inline-error/inline-error';
import type { TenantSummary } from '../../../../core/models/auth.model';

/**
 * Workspace selection state.
 *
 * Shown when the account has memberships but no active workspace yet. The
 * component stays presentational: the container performs the switch through
 * the shared tenant context and reports the outcome.
 */
@Component({
  selector: 'app-workspace-picker',
  standalone: true,
  imports: [Button, InlineError, LucideBuilding2],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './workspace-picker.html',
  styleUrl: './workspace-picker.css'
})
export class WorkspacePicker {
  readonly memberships = input<readonly TenantSummary[]>([]);
  readonly switching = input(false);
  readonly error = input<string | null>(null);

  /** Emits the workspace the user wants to activate. */
  readonly select = output<string>();
}
