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

  protected readonly frameStyle = computed<PreviewStyle>(() => {
    const theme = this.config()?.theme ?? {};
    const color = (key: string, fallback: string): string =>
      isValidHexColor(theme[key]) ? theme[key] as string : fallback;
    const font = (key: string): string =>
      isSupportedFont(theme[key]) ? `"${theme[key]}", ${theme[key] === 'system-ui' ? 'inherit' : 'sans-serif'}` : 'inherit';

    return {
      '--pv-primary': color('primaryColor', '#b3261e'),
      '--pv-secondary': color('secondaryColor', '#7a5900'),
      '--pv-accent': color('accentColor', '#ff8f00'),
      '--pv-bg': color('backgroundColor', '#ffffff'),
      '--pv-text': color('textColor', '#1c1b1f'),
      '--pv-heading-font': font('headingFont'),
      '--pv-body-font': font('bodyFont')
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
