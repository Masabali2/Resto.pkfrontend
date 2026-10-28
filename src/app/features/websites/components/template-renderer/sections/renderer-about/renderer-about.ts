import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal
} from '@angular/core';
import type {
  TemplateRendererMode,
  WebsiteTemplateDesignViewModel
} from '../../../../models/website-template-design.model';

/**
 * About section of the generic renderer. It reuses the safe sample copy and
 * the category tags that ship with the design configuration.
 *
 * When an About asset is registered it replaces the decorative visual; a
 * template without one (or with a failed image load) keeps the original
 * palette-only illustration.
 */
@Component({
  selector: 'app-renderer-about',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './renderer-about.html',
  styleUrl: './renderer-about.css'
})
export class RendererAbout {
  readonly viewModel = input.required<WebsiteTemplateDesignViewModel>();
  readonly mode = input<TemplateRendererMode>('card');

  protected readonly configuration = computed(
    () => this.viewModel().configuration
  );

  protected readonly highlights = computed(() =>
    this.configuration()
      .tags.slice(0, 3)
      .map(tag => tag.replace(/-/g, ' '))
  );

  protected readonly aboutAsset = computed(() => this.viewModel().media.about);

  private readonly imageFailed = signal(false);

  protected readonly showAboutImage = computed(
    () => this.aboutAsset() !== null && !this.imageFailed()
  );

  protected readonly description = computed(() => {
    const content = this.configuration().previewContent;

    return (
      content.heroDescription ||
      'A kitchen shaped by its ingredients, its people and the guests who keep coming back.'
    );
  });

  protected onImageError(): void {
    this.imageFailed.set(true);
  }
}
