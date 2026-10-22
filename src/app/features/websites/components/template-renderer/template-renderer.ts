import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input
} from '@angular/core';
import type {
  TemplateRendererMode,
  WebsiteTemplateDesignViewModel
} from '../../models/website-template-design.model';
import { RendererAbout } from './sections/renderer-about/renderer-about';
import { RendererContact } from './sections/renderer-contact/renderer-contact';
import { RendererFooter } from './sections/renderer-footer/renderer-footer';
import { RendererGallery } from './sections/renderer-gallery/renderer-gallery';
import { RendererHeader } from './sections/renderer-header/renderer-header';
import { RendererHero } from './sections/renderer-hero/renderer-hero';
import { RendererMenu } from './sections/renderer-menu/renderer-menu';

/**
 * The one generic website renderer.
 *
 * Every catalogue template is rendered by this component: the differences
 * between the ten designs come exclusively from the validated design
 * configuration (palette, typography, layout variants, enabled sections and
 * their order). There is deliberately no per-template Angular component.
 *
 * The renderer is presentation-only — it performs no HTTP calls, owns no
 * state and never interprets untrusted markup.
 */
@Component({
  selector: 'app-template-renderer',
  standalone: true,
  imports: [
    RendererHeader,
    RendererHero,
    RendererMenu,
    RendererAbout,
    RendererGallery,
    RendererContact,
    RendererFooter
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './template-renderer.html',
  styleUrl: './template-renderer.css',
  host: {
    '[class.tpl-renderer--card]': "mode() === 'card'",
    '[class.tpl-renderer--full]': "mode() === 'full'",
    '[style.--tpl-background]': 'tokens()["--tpl-background"]',
    '[style.--tpl-surface]': 'tokens()["--tpl-surface"]',
    '[style.--tpl-text]': 'tokens()["--tpl-text"]',
    '[style.--tpl-muted]': 'tokens()["--tpl-muted"]',
    '[style.--tpl-primary]': 'tokens()["--tpl-primary"]',
    '[style.--tpl-accent]': 'tokens()["--tpl-accent"]',
    '[style.--tpl-border]': 'tokens()["--tpl-border"]',
    '[style.--tpl-on-primary]': 'tokens()["--tpl-on-primary"]',
    '[style.--tpl-heading-font]': 'tokens()["--tpl-heading-font"]',
    '[style.--tpl-body-font]': 'tokens()["--tpl-body-font"]',
    '[style.--tpl-heading-weight]': 'tokens()["--tpl-heading-weight"]',
    '[style.--tpl-heading-tracking]': 'tokens()["--tpl-heading-tracking"]',
    '[style.--tpl-radius]': 'tokens()["--tpl-radius"]',
    '[style.--tpl-button-radius]': 'tokens()["--tpl-button-radius"]'
  }
})
export class TemplateRenderer {
  readonly viewModel = input.required<WebsiteTemplateDesignViewModel>();
  readonly mode = input<TemplateRendererMode>('card');
  /** Restaurant name shown in the rendered header and footer. */
  readonly brandName = input('Your Restaurant');

  protected readonly tokens = computed(() => this.viewModel().cssVariables);
}
