import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input
} from '@angular/core';
import type {
  TemplateRendererMode,
  WebsiteTemplateDesignViewModel
} from '../../../../models/website-template-design.model';

/**
 * Hero section of the generic renderer. Five allow-listed layout variants
 * (`split`, `centered`, `image-led`, `cinematic`, `asymmetric`) drive the
 * composition; the copy comes from the design configuration.
 */
@Component({
  selector: 'app-renderer-hero',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './renderer-hero.html',
  styleUrl: './renderer-hero.css'
})
export class RendererHero {
  readonly viewModel = input.required<WebsiteTemplateDesignViewModel>();
  readonly mode = input<TemplateRendererMode>('card');

  protected readonly layout = computed(
    () => this.viewModel().configuration.design.layout.hero
  );

  protected readonly content = computed(
    () => this.viewModel().configuration.previewContent
  );
}
