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
 * Gallery section of the generic renderer. The tiles are decorative
 * placeholders painted with the template's own palette — no external image
 * is required for the preview to work.
 */
@Component({
  selector: 'app-renderer-gallery',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './renderer-gallery.html',
  styleUrl: './renderer-gallery.css'
})
export class RendererGallery {
  readonly viewModel = input.required<WebsiteTemplateDesignViewModel>();
  readonly mode = input<TemplateRendererMode>('card');

  protected readonly layout = computed(
    () => this.viewModel().configuration.design.layout.gallery
  );

  protected readonly tiles = computed(() => [1, 2, 3, 4, 5, 6]);
}
