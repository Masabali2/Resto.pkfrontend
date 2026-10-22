import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output
} from '@angular/core';
import { LucideArrowRight, LucideCheck } from '@lucide/angular';
import type { SetupStep } from '../../models/setup-step.model';

/**
 * Reusable onboarding checklist.
 *
 * The component is purely presentational: the container decides which steps
 * exist and what state they are in, so real backend driven progress can be
 * wired in later without changing the component.
 */
@Component({
  selector: 'app-setup-progress',
  standalone: true,
  imports: [LucideArrowRight, LucideCheck],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './setup-progress.html',
  styleUrl: './setup-progress.css'
})
export class SetupProgress {
  readonly steps = input<readonly SetupStep[]>([]);
  readonly kicker = input('YOUR GETTING-STARTED PLAN');
  readonly title = input('Your restaurant journey');
  readonly description = input<string | null>(null);

  /** Emits the step whose inline action was triggered. */
  readonly stepAction = output<SetupStep>();

  protected readonly totalCount = computed(() => this.steps().length);

  protected readonly completedCount = computed(
    () => this.steps().filter(step => step.status === 'completed').length
  );

  protected readonly progressPercent = computed(() => {
    const total = this.totalCount();

    if (total === 0) {
      return 0;
    }

    return Math.round((this.completedCount() / total) * 100);
  });
}
