import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { SupportedFont, WebsiteConfig } from '../../models/website-config.model';
import {
  fontOptions,
  isValidHexColor,
  isSupportedFont,
  THEME_COLOR_FIELDS,
  type ThemeColorField
} from '../../utils/website-config.util';

export type ThemeChange =
  | { kind: 'color'; field: ThemeColorField; value: string }
  | { kind: 'font'; value: SupportedFont };

const COLOR_LABELS: Record<ThemeColorField, string> = {
  primary: 'Primary color',
  secondary: 'Secondary color',
  accent: 'Accent color',
  background: 'Background color',
  text: 'Text color'
};

const FALLBACK_COLORS: Record<ThemeColorField, string> = {
  primary: '#b3261e',
  secondary: '#7a5900',
  accent: '#ff8f00',
  background: '#ffffff',
  text: '#1c1b1f'
};

/**
 * Presentational settings panel for the theme fields supported by the
 * backend WebsiteConfigSchema (`theme.colors` map of hex values and a single
 * allow-listed `theme.font`). It never mutates the configuration itself;
 * all edits are emitted as validated ThemeChange intents.
 */
@Component({
  selector: 'app-editor-settings-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './editor-settings-panel.html',
  styleUrl: './editor-settings-panel.css'
})
export class EditorSettingsPanel {
  readonly config = input.required<WebsiteConfig>();

  readonly themeChange = output<ThemeChange>();

  protected readonly colorFields = THEME_COLOR_FIELDS;
  protected readonly fontChoices = fontOptions();

  protected readonly colorLabel = (field: ThemeColorField): string => COLOR_LABELS[field];

  protected readonly colorValue = computed(() => {
    const colors = this.config().theme.colors ?? {};

    return (field: ThemeColorField): string => {
      const raw = colors[field];
      return isValidHexColor(raw) ? raw : FALLBACK_COLORS[field];
    };
  });

  protected readonly fontValue = computed((): string => {
    const raw = this.config().theme.font;
    return isSupportedFont(raw) ? raw : 'system-ui';
  });

  protected onColorInput(field: ThemeColorField, value: string): void {
    if (isValidHexColor(value)) {
      this.themeChange.emit({ kind: 'color', field, value });
    }
  }

  protected onFontChange(value: string): void {
    if (isSupportedFont(value)) {
      this.themeChange.emit({ kind: 'font', value });
    }
  }
}
