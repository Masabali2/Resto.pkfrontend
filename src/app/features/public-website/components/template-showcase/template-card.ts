import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Button } from '../../../../shared/components/button/button';
import { TemplateCardModel } from './template-data';

/**
 * A single marketing card in the public-website template showcase.
 *
 * Purely presentational: it renders one TemplateCardModel and emits intent
 * events. The parent (TemplateShowcase) decides what Preview / Use Template
 * actually do, so this card never navigates or claims a site is live.
 */
@Component({
  selector: 'app-template-card',
  standalone: true,
  imports: [Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './template-card.html',
  styleUrl: './template-card.css'
})
export class TemplateCard {
  readonly template = input.required<TemplateCardModel>();
  /** Position of the card in the grid — drives the staggered entrance delay. */
  readonly index = input(0);

  readonly preview = output<void>();
  readonly useTemplate = output<void>();

  protected onPreview(): void {
    this.preview.emit();
  }

  protected onUseTemplate(): void {
    this.useTemplate.emit();
  }
}
