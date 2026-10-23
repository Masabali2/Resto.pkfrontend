import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { WebsiteConfig, WebsiteSectionConfig } from '../../models/website-config.model';
import { isValidHexColor, isSupportedFont } from '../../utils/website-config.util';

interface PreviewStyle {
  [key: string]: string;
}

/**
 * Renders the current editor configuration with normal Angular template
 * bindings only. Configuration values never enter the DOM as raw HTML, so
 * untrusted strings cannot inject markup or scripts.
 */
@Component({
  selector: 'app-website-preview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './website-preview.html',
  styleUrl: './website-preview.css'
})
export class WebsitePreview {
  readonly config = input.required<WebsiteConfig | null>();
  readonly websiteName = input('');
  readonly unsupportedReason = input<string | null>(null);

  /**
   * Canonical theme location (backend schema): `theme.colors.<name>` hex map
   * and a single allow-listed `theme.font`. This mirrors the settings panel's
   * write path exactly, so color/typography edits always reach the preview.
   */
  protected readonly frameStyle = computed<PreviewStyle>(() => {
    const theme = this.config()?.theme;
    const colors = theme?.colors ?? {};
    const color = (key: string, fallback: string): string => {
      const value = (colors as Record<string, unknown>)[key];
      return isValidHexColor(value) ? (value as string) : fallback;
    };
    const font = isSupportedFont(theme?.font)
      ? `"${theme?.font}", ${theme?.font === 'system-ui' ? 'inherit' : 'sans-serif'}`
      : 'inherit';

    return {
      '--pv-primary': color('primary', '#b3261e'),
      '--pv-secondary': color('secondary', '#7a5900'),
      '--pv-accent': color('accent', '#ff8f00'),
      '--pv-bg': color('background', '#ffffff'),
      '--pv-text': color('text', '#1c1b1f'),
      '--pv-heading-font': font,
      '--pv-body-font': font
    };
  });

  protected readonly sections = computed<WebsiteSectionConfig[]>(
    () => this.config()?.sections ?? []
  );

  /** Reads a string setting from a section without trusting its content. */
  protected text(section: WebsiteSectionConfig, key: string, fallback = ''): string {
    const value = section.settings?.[key];
    return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
  }

  protected items(section: WebsiteSectionConfig, key: string): string[] {
    const value = section.settings?.[key];

    if (!Array.isArray(value)) {
      return [];
    }

    return value.filter((entry): entry is string => typeof entry === 'string');
  }
}
