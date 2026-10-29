import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal
} from '@angular/core';
import { BRANDING_BODY_FONTS, BRANDING_HEADING_FONTS, brandingFontClass } from '../../models/branding-assets.models';
import type { BrandingTheme, BrandingTypography } from '../../models/branding-assets.models';

@Component({
  selector: 'app-typography-settings',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './typography-settings.html',
  styleUrl: './typography-settings.css'
})
export class TypographySettings {
  readonly typography = input<BrandingTypography>({
    headingFont: 'plus-jakarta-sans',
    bodyFont: 'plus-jakarta-sans',
    fontScale: 100
  });

  readonly theme = input<BrandingTheme>({ primary: '#F97316', secondary: '#0F172A', tint: '#FFF7ED' });

  readonly typographyChange = output<BrandingTypography>();

  readonly headingFonts = BRANDING_HEADING_FONTS;
  readonly bodyFonts = BRANDING_BODY_FONTS;

  private readonly headingFontSignal = signal<string>('plus-jakarta-sans');
  private readonly bodyFontSignal = signal<string>('plus-jakarta-sans');
  private readonly fontScaleSignal = signal<number>(100);

  readonly headingFont = computed(() => this.headingFontSignal());
  readonly bodyFont = computed(() => this.bodyFontSignal());
  readonly fontScale = computed(() => this.fontScaleSignal());

  constructor() {
    effect(() => {
      const t = this.typography();
      this.headingFontSignal.set(t.headingFont);
      this.bodyFontSignal.set(t.bodyFont);
      this.fontScaleSignal.set(t.fontScale);
    });
  }

  protected headingFontClass(): string {
    return brandingFontClass(this.headingFontSignal() as any);
  }

  protected bodyFontClass(): string {
    return brandingFontClass(this.bodyFontSignal() as any);
  }

  protected themePrimary(): string {
    return this.theme().primary;
  }

  onHeadingFontChange(value: string): void {
    this.headingFontSignal.set(value);
    this.emit();
  }

  onBodyFontChange(value: string): void {
    this.bodyFontSignal.set(value);
    this.emit();
  }

  onFontScaleChange(value: string): void {
    this.fontScaleSignal.set(Number(value));
    this.emit();
  }

  private emit(): void {
    this.typographyChange.emit({
      headingFont: this.headingFontSignal(),
      bodyFont: this.bodyFontSignal(),
      fontScale: this.fontScaleSignal()
    });
  }
}
