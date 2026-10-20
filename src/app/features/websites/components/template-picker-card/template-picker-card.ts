import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { WebsiteTemplateDto } from '../../models/website-template.model';

/**
 * Presentational card for a real backend template in the website-creation
 * flow. Selection state and intent are owned by the parent page; this card
 * never navigates or mutates data.
 */
@Component({
  selector: 'app-template-picker-card',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './template-picker-card.html',
  styleUrl: './template-picker-card.css'
})
export class TemplatePickerCard {
  readonly template = input.required<WebsiteTemplateDto>();
  readonly selected = input(false);
  /** Usable preview image URL resolved by the parent, when one exists. */
  readonly previewImageUrl = input<string | null>(null);

  readonly select = output<void>();

  protected onSelect(): void {
    if (!this.selected()) {
      this.select.emit();
    }
  }
}
