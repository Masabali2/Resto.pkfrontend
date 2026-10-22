
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
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
  readonly actions = input.required<QuickAction[]>();
  readonly actionSelected = output<QuickAction>();

  protected selectAction(action: QuickAction): void {
    this.actionSelected.emit(action);
  }
}
