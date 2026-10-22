import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import {
  LucideArrowRight,
  LucideBuilding2,
  LucideCheck
} from '@lucide/angular';
import { Button } from '../../../../shared/components/button/button';

/**
 * Primary call to action of the first run experience: create the workspace.
 */
@Component({
  selector: 'app-onboarding-workspace-prompt',
  standalone: true,
  imports: [Button, LucideArrowRight, LucideBuilding2, LucideCheck],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './onboarding-workspace-prompt.html',
  styleUrl: './onboarding-workspace-prompt.css'
})
export class OnboardingWorkspacePrompt {
  /** Emitted when the user starts the workspace creation flow. */
  readonly createWorkspace = output<void>();
}
