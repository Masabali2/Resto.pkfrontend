import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Hero } from './hero';

describe('Hero', () => {
  let fixture: ComponentFixture<Hero>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Hero],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Hero);
    fixture.detectChanges();
  });

  function el<T extends Element = HTMLElement>(selector: string): T | null {
    return fixture.nativeElement.querySelector(selector) as T | null;
  }

  it('creates the component', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders the headline and supporting copy', () => {
    const titleText = el('#hero-title')?.textContent ?? '';
    expect(titleText).toContain('Your Restaurant');
    expect(titleText).toContain('Deserves a');
    expect(titleText).toContain('Beautiful Website');
    expect(fixture.nativeElement.textContent).toContain(
      'Create a stunning online home for your restaurant'
    );
  });

  it('keeps an accessible section landmark labelled by the headline', () => {
    const section = el('section.hero-section');
    expect(section?.getAttribute('aria-labelledby')).toBe('hero-title');
  });

  it('links the primary CTA to the existing register route', () => {
    const cta = el<HTMLAnchorElement>('[data-testid="hero-cta-start"]');
    expect(cta).toBeTruthy();
    expect(cta?.getAttribute('href')).toContain('/register');
    expect(cta?.textContent).toContain('Get Started');
  });

  it('links the secondary CTA to the on-page templates anchor', () => {
    const cta = el<HTMLAnchorElement>('[data-testid="hero-cta-templates"]');
    expect(cta).toBeTruthy();
    expect(cta?.getAttribute('href')).toBe('#templates');
    expect(cta?.textContent).toContain('Explore Templates');
  });

  it('labels the showcase for assistive tech and hides decorative layers', () => {
    const showcase = el('.hero-showcase');
    expect(showcase?.getAttribute('role')).toBe('img');
    expect(showcase?.getAttribute('aria-label')).toContain('restaurant website');
    const decorative = fixture.nativeElement.querySelectorAll('.float-card, .hero-orb, .showcase-texture');
    expect(decorative.length).toBeGreaterThan(0);
    decorative.forEach((node: Element) => expect(node.getAttribute('aria-hidden')).toBe('true'));
  });

  it('shows only qualitative trust items without invented metrics', () => {
    const trust = el('.trust-row');
    expect(trust).toBeTruthy();
    expect(trust?.textContent).toContain('Built for Pakistani restaurants');
    expect(trust?.textContent).not.toMatch(/1,?000|guarantee|₨/i);
  });

  it('stages entrance animations with per-element delay custom properties', () => {
    const staged = fixture.nativeElement.querySelectorAll('[style*="--hero-delay"]');
    expect(staged.length).toBeGreaterThanOrEqual(4);
  });
});
