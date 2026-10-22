import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LucideSparkles } from '@lucide/angular';

/**
 * First run hero shown while the account has no workspace yet.
 */
@Component({
  selector: 'app-onboarding-welcome',
  standalone: true,
  imports: [LucideSparkles],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './onboarding-welcome.html',
  styleUrl: './onboarding-welcome.css'
})
export class OnboardingWelcome {}
