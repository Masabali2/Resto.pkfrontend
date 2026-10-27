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
 * Menu section of the generic renderer. Five allow-listed arrangements
 * (`featured-cards`, `compact-cards`, `editorial-list`, `grid-cards`,
 * `list-rows`) are driven by `layout.menu`.
 */
@Component({
  selector: 'app-renderer-menu',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './renderer-menu.html',
  styleUrl: './renderer-menu.css'
})
export class RendererMenu {
  readonly viewModel = input.required<WebsiteTemplateDesignViewModel>();
  readonly mode = input<TemplateRendererMode>('card');

  protected readonly layout = computed(
    () => this.viewModel().configuration.design.layout.menu
  );

  protected readonly dishes = computed(
    () => this.viewModel().configuration.previewContent.sampleDishes
  );
}
