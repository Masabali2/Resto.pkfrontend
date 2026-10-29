import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal
} from '@angular/core';
import type { BrandingTheme } from '../../models/branding-assets.models';

export interface ThemePreset {
  primary: string;
  secondary: string;
  tint: string;
  name: string;
}

const THEME_PRESETS: readonly ThemePreset[] = [
  { primary: '#F97316', secondary: '#0F172A', tint: '#FFF7ED', name: 'Fiery Amber (Default)' },
  { primary: '#10B981', secondary: '#064E3B', tint: '#ECFDF5', name: 'Organic Matcha' },
  { primary: '#6366F1', secondary: '#1E1B4B', tint: '#EEF2FF', name: 'Modern Indigo' },
  { primary: '#E11D48', secondary: '#4C0519', tint: '#FFF1F2', name: 'Royal Ruby' }
];

const HEX_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function isValidHex(value: string): boolean {
  return HEX_PATTERN.test(value);
}

@Component({
  selector: 'app-brand-colors',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './brand-colors.html',
  styleUrl: './brand-colors.css'
})
export class BrandColors {
  readonly theme = input<BrandingTheme>({
    primary: '#F97316',
    secondary: '#0F172A',
    tint: '#FFF7ED'
  });

  readonly themeChange = output<BrandingTheme>();

  readonly presets = THEME_PRESETS;

  private readonly primarySignal = signal<string>('#F97316');
  private readonly secondarySignal = signal<string>('#0F172A');
  private readonly tintSignal = signal<string>('#FFF7ED');

  readonly primary = computed(() => this.primarySignal());
  readonly secondary = computed(() => this.secondarySignal());
  readonly tint = computed(() => this.tintSignal());

  readonly colorFields = computed(() => [
    { key: 'primary', label: 'Primary Accent Color', value: this.primary() },
    { key: 'secondary', label: 'Dark Secondary Color', value: this.secondary() },
    { key: 'tint', label: 'Light Surface Tint', value: this.tint() }
  ] as const);

  constructor() {
    effect(() => {
      const theme = this.theme();
      this.primarySignal.set(theme.primary);
      this.secondarySignal.set(theme.secondary);
      this.tintSignal.set(theme.tint);
    });
  }

  applyPreset(preset: ThemePreset): void {
    this.primarySignal.set(preset.primary);
    this.secondarySignal.set(preset.secondary);
    this.tintSignal.set(preset.tint);
    this.emit();
  }

  onPrimaryPickerChange(value: string): void {
    this.primarySignal.set(value);
    this.emit();
  }

  onSecondaryPickerChange(value: string): void {
    this.secondarySignal.set(value);
    this.emit();
  }

  onTintPickerChange(value: string): void {
    this.tintSignal.set(value);
    this.emit();
  }

  onPrimaryTextChange(value: string): void {
    if (isValidHex(value)) {
      this.primarySignal.set(value);
      this.emit();
    }
  }

  onSecondaryTextChange(value: string): void {
    if (isValidHex(value)) {
      this.secondarySignal.set(value);
      this.emit();
    }
  }

  onTintTextChange(value: string): void {
    if (isValidHex(value)) {
      this.tintSignal.set(value);
      this.emit();
    }
  }

  presetHint(preset: ThemePreset): string {
    const hints: Record<string, string> = {
      'Fiery Amber (Default)': 'Warm Grill & Bistro',
      'Organic Matcha': 'Fresh Healthy & Vegan',
      'Modern Indigo': 'Sleek Fine Dining',
      'Royal Ruby': 'Steakhouse & Bakery'
    };
    return hints[preset.name] ?? '';
  }

  onColorPickerChange(key: 'primary' | 'secondary' | 'tint', event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.setColor(key, value);
  }

  onColorTextChange(key: 'primary' | 'secondary' | 'tint', value: string): void {
    this.setColor(key, value);
  }

  private setColor(key: 'primary' | 'secondary' | 'tint', value: string): void {
    const trimmed = value.trim();
    if (!isValidHex(trimmed)) {
      return;
    }
    if (key === 'primary') {
      this.primarySignal.set(trimmed);
    } else if (key === 'secondary') {
      this.secondarySignal.set(trimmed);
    } else {
      this.tintSignal.set(trimmed);
    }
    this.emit();
  }

  private emit(): void {
    this.themeChange.emit({
      primary: this.primarySignal(),
      secondary: this.secondarySignal(),
      tint: this.tintSignal()
    });
  }
}
