import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  LucideCircleHelp,
  LucideClipboardList,
  LucideLayoutTemplate,
  LucideStore
} from '@lucide/angular';

/**
 * Static first run content: what the platform offers and where to get help.
 *
 * The block carries no interactive elements on purpose — a help centre page
 * does not exist yet, so the section stays informational instead of linking to
 * a page that cannot be opened.
 */
@Component({
  selector: 'app-onboarding-highlights',
  standalone: true,
  imports: [
    LucideCircleHelp,
    LucideClipboardList,
    LucideLayoutTemplate,
    LucideStore
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './onboarding-highlights.html',
  styleUrl: './onboarding-highlights.css'
})
export class OnboardingHighlights {}
