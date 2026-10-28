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
 * Gallery section of the generic renderer.
 *
 * When the design configuration registers gallery assets, their declared order
 * is preserved and each image is lazy-loaded. Templates without an asset
 * registry keep the original palette-painted placeholders. Individual image
 * failures only remove that tile; if every image fails the decorative
 * placeholders take over, so the preview never crashes or shows broken images.
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

  protected readonly galleryAssets = computed(
    () => this.viewModel().media.gallery
  );

  private readonly failedAssetIds = signal<ReadonlySet<string>>(new Set());

  protected readonly visibleAssets = computed(() =>
    this.galleryAssets().filter(
      asset => !this.failedAssetIds().has(asset.assetId)
    )
  );

  protected onImageError(assetId: string): void {
    this.failedAssetIds.update(current => {
      const next = new Set(current);
      next.add(assetId);

      return next;
    });
  }
}
