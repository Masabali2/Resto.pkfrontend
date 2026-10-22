import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  LucideArrowRight,
  LucideChefHat,
  LucideGlobe,
  LucideLayers,
  LucideUtensils
} from '@lucide/angular';
import type { QuickAction } from '../../models/quick-action.model';

/**
 * Shortcuts to the next meaningful action of the workspace.
 *
 * Every action points at a route that exists in app.routes.ts. Actions the
 * account cannot use yet stay visible but are disabled with a reason, so the
 * dashboard never links to a page the user cannot open.
 */
@Component({
  selector: 'app-quick-actions',
  standalone: true,
  imports: [
    NgTemplateOutlet,
    RouterLink,
    LucideArrowRight,
    LucideChefHat,
    LucideGlobe,
    LucideLayers,
    LucideUtensils
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './quick-actions.html',
  styleUrl: './quick-actions.css'
})
export class QuickActions {
  readonly actions = input<readonly QuickAction[]>([]);
}
