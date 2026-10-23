import { ChangeDetectionStrategy, Component, computed, input, signal, effect } from '@angular/core';
import { TemplateRenderer } from '../template-renderer/template-renderer';
import { WebsitePreview } from '../website-preview/website-preview';
import type { WebsiteTemplateDesignViewModel } from '../../models/website-template-design.model';
import type { WebsiteConfig } from '../../models/website-config.model';
import type { WebsiteTemplateCatalogueItem } from '../../models/website-template-catalogue.model';
import { parseWebsiteTemplateDesign } from '../../utils/website-template-design.util';

type ViewportMode = 'mobile' | 'tablet' | 'desktop';

const VIEWPORT_WIDTHS: Record<ViewportMode, number> = {
  mobile: 375,
  tablet: 768,
  desktop: 1200
};

@Component({
  selector: 'app-preview-canvas',
  standalone: true,
  imports: [TemplateRenderer, WebsitePreview],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './preview-canvas.html',
  styleUrl: './preview-canvas.css'
})
export class PreviewCanvas {
  readonly config = input.required<WebsiteConfig | null>();
  readonly websiteName = input.required<string>();
  readonly template = input<WebsiteTemplateCatalogueItem | null>(null);
  readonly viewportMode = input.required<ViewportMode>();
  readonly unsupportedReason = input<string | null>(null);

  protected readonly templateDesign = signal<WebsiteTemplateDesignViewModel | null>(null);
  protected readonly designError = signal<string | null>(null);

  protected readonly viewportWidth = computed(() => VIEWPORT_WIDTHS[this.viewportMode()]);
  protected readonly isDesktop = computed(() => this.viewportMode() === 'desktop');

  constructor() {
    effect(() => {
      const tpl = this.template();
      if (tpl?.design) {
        this.templateDesign.set(tpl.design);
        this.designError.set(null);
      } else if (tpl?.designError) {
        this.templateDesign.set(null);
        this.designError.set(tpl.designError);
      } else if (tpl?.template.designConfigurationJson) {
        const parsed = parseWebsiteTemplateDesign(tpl.template.designConfigurationJson);
        this.templateDesign.set(parsed.viewModel);
        this.designError.set(parsed.error);
      } else {
        this.templateDesign.set(null);
        this.designError.set('No template design available');
      }
    });
  }

  /**
   * Canonical theme location (backend schema): `theme.colors.<name>` hex map
   * and a single allow-listed `theme.font`. Unknown/legacy top-level keys are
   * intentionally NOT read here so there is exactly one mapping between the
   * settings panel, the persisted draft, and this preview.
   */
  protected readonly previewStyle = computed<Record<string, string>>(() => {
    const theme = this.config()?.theme;
    const colors = theme?.colors ?? {};
    const color = (key: keyof typeof colors | string, fallback: string): string => {
      const value = (colors as Record<string, unknown>)[key];
      return typeof value === 'string' && value.startsWith('#') ? value : fallback;
    };
    const font = theme?.font && typeof theme.font === 'string' ? theme.font : 'system-ui';

    return {
      '--pv-primary': color('primary', '#b3261e'),
      '--pv-secondary': color('secondary', '#7a5900'),
      '--pv-accent': color('accent', '#ff8f00'),
      '--pv-bg': color('background', '#ffffff'),
      '--pv-text': color('text', '#1c1b1f'),
      '--pv-heading-font': `"${font}", sans-serif`,
      '--pv-body-font': `"${font}", sans-serif`
    };
  });

  protected readonly browserChromeStyle = computed(() => ({
    width: `${this.viewportWidth()}px`,
    maxWidth: '100%'
  }));

  protected slugFromName(): string {
    return this.websiteName()
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  protected viewportLabel(): string {
    const mode = this.viewportMode();
    return mode.charAt(0).toUpperCase() + mode.slice(1);
  }
}