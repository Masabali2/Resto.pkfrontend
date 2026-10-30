import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrandingTabs } from './branding-tabs';
import type { BrandingTab } from './branding-tabs';

describe('BrandingTabs', () => {
  let component: BrandingTabs;
  let fixture: ComponentFixture<BrandingTabs>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BrandingTabs]
    }).compileComponents();

    fixture = TestBed.createComponent(BrandingTabs);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should default activeTab to assets', () => {
    expect(component.activeTab()).toBe('assets');
  });

  it('should expose all five tabs', () => {
    expect((component as any).tabs.map((t: { id: BrandingTab }) => t.id)).toEqual([
      'assets',
      'colors',
      'typography',
      'hero',
      'library'
    ]);
  });

  it('selectTab should emit tabSelected with the chosen tab', () => {
    let emitted: BrandingTab | null = null;
    component.tabSelected.subscribe(tab => (emitted = tab));
    (component as any).selectTab('colors');
    expect(emitted).toBe('colors');
  });

  it('isActive should reflect the active tab', () => {
    (component as any).activeTab.set('hero');
    expect((component as any).isActive('hero')).toBe(true);
    expect((component as any).isActive('assets')).toBe(false);
  });

  it('tabClass should mark active tab with active classes', () => {
    (component as any).activeTab.set('colors');
    expect((component as any).tabClass('colors')).toContain('branding-tab-active');
    expect((component as any).tabClass('assets')).not.toContain('branding-tab-active');
    expect((component as any).tabClass('assets')).toContain('text-muted');
  });

  it('should render a button for each tab', () => {
    const buttons = fixture.nativeElement.querySelectorAll('button');
    expect(buttons.length).toBe((component as any).tabs.length);
  });
});
