import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TemplateRenderer } from '../template-renderer/template-renderer';
import type { WebsiteTemplateDesignViewModel } from '../../models/website-template-design.model';
import type { WebsiteTemplateDto } from '../../models/website-template.model';

/**
 * Presentational card for a real backend template in the website-creation
 * flow.
 *
 * The card owns no routing, HTTP or website-creation logic: it renders the
 * generic renderer with the template's own design configuration and reports
 * the user's intent through its outputs.
 *
 * Two distinct actions live here:
 *  - clicking the card (or its button) SELECTS the template;
 *  - the dedicated "Preview" action opens the larger preview dialog.
 */
@Component({
  selector: 'app-template-picker-card',
  standalone: true,
  imports: [TemplateRenderer],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './template-picker-card.html',
  styleUrl: './template-picker-card.css'
})
export class TemplatePickerCard {
  readonly template = input.required<WebsiteTemplateDto>();
  readonly selected = input(false);
  /** Usable preview image URL resolved by the parent, when one exists. */
  readonly previewImageUrl = input<string | null>(null);
  /** Parsed design configuration; null when it is missing or malformed. */
  readonly design = input<WebsiteTemplateDesignViewModel | null>(null);
  /** Message explaining why the preview could not be rendered. */
  readonly designError = input<string | null>(null);

  readonly select = output<void>();
  readonly preview = output<void>();

  protected readonly category = computed(
    () => this.design()?.configuration.category ?? ''
  );

  protected readonly tags = computed(() => this.design()?.configuration.tags ?? []);

  protected readonly featured = computed(
    () => this.design()?.configuration.featured ?? false
  );

  protected readonly description = computed(
    () => this.template().description || 'No description provided for this design yet.'
  );

  protected onSelect(): void {
    if (!this.selected()) {
      this.select.emit();
    }
  }

  protected onPreview(): void {
    this.preview.emit();
  }
}
