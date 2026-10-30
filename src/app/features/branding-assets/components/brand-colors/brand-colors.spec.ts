import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrandColors } from './brand-colors';
import type { BrandingTheme } from '../../models/branding-assets.models';

describe('BrandColors', () => {
  let component: BrandColors;
  let fixture: ComponentFixture<BrandColors>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BrandColors]
    }).compileComponents();

    fixture = TestBed.createComponent(BrandColors);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should expose four theme presets', () => {
    expect(component.presets.length).toBe(4);
  });

  it('should default theme inputs', () => {
    expect(component.theme()).toEqual({
      primary: '#F97316',
      secondary: '#0F172A',
      tint: '#FFF7ED'
    });
  });

  it('applyPreset should emit themeChange with the preset colors', () => {
    let emitted: BrandingTheme | null = null;
    component.themeChange.subscribe(t => (emitted = t));
    component.applyPreset(component.presets[1]);
    expect(emitted).toEqual({
      primary: component.presets[1].primary,
      secondary: component.presets[1].secondary,
      tint: component.presets[1].tint
    });
  });

  it('onPrimaryPickerChange should update primary', () => {
    component.onPrimaryPickerChange('#10B981');
    expect(component.primary()).toBe('#10B981');
  });

  it('onSecondaryPickerChange should update secondary', () => {
    component.onSecondaryPickerChange('#E11D48');
    expect(component.secondary()).toBe('#E11D48');
  });

  it('onTintPickerChange should update tint', () => {
    component.onTintPickerChange('#6366F1');
    expect(component.tint()).toBe('#6366F1');
  });

  it('onPrimaryTextChange should ignore invalid hex values', () => {
    component.onPrimaryTextChange('not-a-hex');
    expect(component.primary()).toBe('#F97316');
  });

  it('onPrimaryTextChange should accept valid hex values', () => {
    component.onPrimaryTextChange('#000000');
    expect(component.primary()).toBe('#000000');
  });

  it('colorFields should expose primary, secondary and tint fields', () => {
    const keys = component.colorFields().map(f => f.key);
    expect(keys).toEqual(['primary', 'secondary', 'tint']);
  });

  it('presetHint should return a hint for known presets', () => {
    expect(component.presetHint(component.presets[0])).toBe('Warm Grill & Bistro');
    expect(component.presetHint({} as any)).toBe('');
  });

  it('emit should build theme from current signal values', () => {
    let emitted: BrandingTheme | null = null;
    component.themeChange.subscribe(t => (emitted = t));
    component.onPrimaryPickerChange('#000000');
    component.onSecondaryPickerChange('#111111');
    component.onTintPickerChange('#222222');
    component.onPrimaryTextChange('#333333');
    expect(emitted).toEqual({ primary: '#333333', secondary: '#111111', tint: '#222222' });
  });
});
