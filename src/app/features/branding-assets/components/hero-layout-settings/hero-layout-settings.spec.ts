import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HeroLayoutSettings } from './hero-layout-settings';
import type { HeroLayout } from '../../models/branding-assets.models';

describe('HeroLayoutSettings', () => {
  let component: HeroLayoutSettings;
  let fixture: ComponentFixture<HeroLayoutSettings>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeroLayoutSettings]
    }).compileComponents();

    fixture = TestBed.createComponent(HeroLayoutSettings);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should default heroLayout to split', () => {
    expect(component.heroLayout()).toBe('split');
    expect(component.layout()).toBe('split');
  });

  it('should expose three layouts', () => {
    expect(component.layouts.map(l => l.value)).toEqual(['split', 'overlay', 'compact']);
  });

  it('selectLayout should emit heroLayoutChange and update layout', () => {
    let emitted: HeroLayout | null = null;
    component.heroLayoutChange.subscribe(l => (emitted = l));
    component.selectLayout('overlay');
    expect(emitted).toBe('overlay');
    expect(component.layout()).toBe('overlay');
  });

  it('selectLayout should update layout signal', () => {
    component.selectLayout('compact');
    expect(component.isActive('compact')).toBe(true);
    expect(component.isActive('split')).toBe(false);
  });

  it('layoutClass should include active classes for active layout', () => {
    component.selectLayout('split');
    expect(component.layoutClass('split')).toContain('hero-layout-active');
    expect(component.layoutClass('overlay')).not.toContain('hero-layout-active');
    expect(component.layoutClass('overlay')).toContain('hover:border-slate-300');
  });

  it('iconFor should return an icon class for each layout', () => {
    expect((component as any).iconFor('split')).toBe('bi-layout-sidebar');
    expect((component as any).iconFor('overlay')).toBe('bi-image-fill');
    expect((component as any).iconFor('compact')).toBe('bi-layout-text-window');
  });
});
