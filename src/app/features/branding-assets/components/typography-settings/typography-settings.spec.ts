import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TypographySettings } from './typography-settings';
import type { BrandingTypography } from '../../models/branding-assets.models';

describe('TypographySettings', () => {
  let component!: TypographySettings;
  let fixture: ComponentFixture<TypographySettings>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TypographySettings]
    }).compileComponents();

    fixture = TestBed.createComponent(TypographySettings);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should expose heading and body font lists', () => {
    expect(component.headingFonts.length).toBeGreaterThan(0);
    expect(component.bodyFonts.length).toBeGreaterThan(0);
  });

  it('should default typography values', () => {
    expect(component.headingFont()).toBe('plus-jakarta-sans');
    expect(component.bodyFont()).toBe('plus-jakarta-sans');
    expect(component.fontScale()).toBe(100);
  });

  it('onHeadingFontChange should update headingFont and emit', () => {
    let emitted: BrandingTypography | null = null;
    component.typographyChange.subscribe(t => (emitted = t));
    component.onHeadingFontChange('outfit');
    expect(component.headingFont()).toBe('outfit');
    expect(emitted).toEqual({ headingFont: 'outfit', bodyFont: 'plus-jakarta-sans', fontScale: 100 });
  });

  it('onBodyFontChange should update bodyFont and emit', () => {
    let emitted: BrandingTypography | null = null;
    component.typographyChange.subscribe(t => (emitted = t));
    component.onBodyFontChange('inter');
    expect(component.bodyFont()).toBe('inter');
    expect(emitted).toEqual({ headingFont: 'plus-jakarta-sans', bodyFont: 'inter', fontScale: 100 });
  });

  it('onFontScaleChange should parse the scale value and emit', () => {
    let emitted: BrandingTypography | null = null;
    component.typographyChange.subscribe(t => (emitted = t));
    component.onFontScaleChange('110');
    expect(component.fontScale()).toBe(110);
    expect(emitted).toEqual({ headingFont: 'plus-jakarta-sans', bodyFont: 'plus-jakarta-sans', fontScale: 110 });
  });

  it('emit should build typography from current signals', () => {
    let emitted: BrandingTypography | null = null;
    component.typographyChange.subscribe(t => (emitted = t));
    component.onHeadingFontChange('playfair-display');
    component.onBodyFontChange('inter');
    component.onFontScaleChange('95');
    expect(emitted).toEqual({
      headingFont: 'playfair-display',
      bodyFont: 'inter',
      fontScale: 95
    });
  });

  it('headingFontClass and bodyFontClass should return font classes', () => {
    expect((component as any).headingFontClass()).toBe('brand-font-plus-jakarta');
    expect((component as any).bodyFontClass()).toBe('brand-font-plus-jakarta');
  });

  it('themePrimary should return the theme primary color', () => {
    (component as any).theme.set({ primary: '#FF0000', secondary: '#000000', tint: '#FFFFFF' });
    expect((component as any).themePrimary()).toBe('#FF0000');
  });
});
