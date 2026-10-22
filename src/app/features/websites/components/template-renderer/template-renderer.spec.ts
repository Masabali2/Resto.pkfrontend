import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TemplateRenderer } from './template-renderer';
import { parseWebsiteTemplateDesign } from '../../utils/website-template-design.util';

const DESIGN = JSON.stringify({
  schemaVersion: 1,
  category: 'Seafood / Coastal',
  tags: ['seafood'],
  featured: false,
  displayOrder: 4,
  design: {
    palette: {
      background: '#F4FAF9',
      surface: '#FFFFFF',
      text: '#123B3E',
      mutedText: '#5B7578',
      primary: '#0E6F73',
      accent: '#2E9C8F',
      border: '#D3E6E4'
    },
    typography: { headingFont: 'serif-editorial', bodyFont: 'sans-humanist' },
    layout: {
      header: 'centered',
      hero: 'centered',
      menu: 'list-rows',
      gallery: 'grid',
      footer: 'multi-column',
      buttons: 'outline',
      corners: 'rounded'
    },
    sections: [
      { type: 'header', enabled: true, order: 1 },
      { type: 'hero', enabled: true, order: 2 },
      { type: 'menu', enabled: true, order: 3 },
      { type: 'gallery', enabled: true, order: 4 },
      { type: 'footer', enabled: true, order: 5 }
    ]
  },
  previewContent: {
    eyebrow: 'Landed this morning',
    heroTitle: 'The Coast, Served Daily',
    heroDescription: 'Line-caught fish.',
    primaryActionLabel: "View Today's Catch",
    sampleDishes: [{ name: 'Grilled King Fish', price: 'PKR 2,450' }]
  }
});

describe('TemplateRenderer', () => {
  let fixture: ComponentFixture<TemplateRenderer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TemplateRenderer]
    }).compileComponents();

    fixture = TestBed.createComponent(TemplateRenderer);
  });

  function el<T extends Element = HTMLElement>(selector: string): T | null {
    return fixture.nativeElement.querySelector(selector) as T | null;
  }

  function render(design: string, mode: 'card' | 'full' = 'card'): void {
    const parsed = parseWebsiteTemplateDesign(design);

    expect(parsed.viewModel).not.toBeNull();

    fixture.componentRef.setInput('viewModel', parsed.viewModel);
    fixture.componentRef.setInput('mode', mode);
    fixture.detectChanges();
  }

  it('renders exactly the enabled sections of the design', () => {
    render(DESIGN);

    expect(el('app-renderer-header')).toBeTruthy();
    expect(el('app-renderer-hero')).toBeTruthy();
    expect(el('app-renderer-menu')).toBeTruthy();
    expect(el('app-renderer-gallery')).toBeTruthy();
    expect(el('app-renderer-footer')).toBeTruthy();

    // "about" and "contact" are not part of this design.
    expect(el('app-renderer-about')).toBeNull();
    expect(el('app-renderer-contact')).toBeNull();
  });

  it('keeps the configured section order', () => {
    const document = JSON.parse(DESIGN);
    document.design.sections = [
      { type: 'footer', enabled: true, order: 1 },
      { type: 'hero', enabled: true, order: 2 },
      { type: 'header', enabled: true, order: 3 }
    ];

    render(JSON.stringify(document));

    const rendered = Array.from(
      fixture.nativeElement.querySelectorAll(
        'app-renderer-header, app-renderer-hero, app-renderer-menu, app-renderer-about, app-renderer-gallery, app-renderer-contact, app-renderer-footer'
      ) as NodeListOf<Element>
    ).map(node => node.tagName.toLowerCase());

    expect(rendered).toEqual([
      'app-renderer-footer',
      'app-renderer-hero',
      'app-renderer-header'
    ]);
  });

  it('applies the validated design tokens as CSS custom properties', () => {
    render(DESIGN);

    const host = fixture.nativeElement as HTMLElement;

    expect(host.style.getPropertyValue('--tpl-background')).toBe('#F4FAF9');
    expect(host.style.getPropertyValue('--tpl-primary')).toBe('#0E6F73');
    expect(host.style.getPropertyValue('--tpl-heading-font')).toBeTruthy();
  });

  it('never leaks an unsanitized value into the style attribute', () => {
    const document = JSON.parse(DESIGN);
    document.design.palette.primary = 'red; background: url(javascript:alert(1))';

    const parsed = parseWebsiteTemplateDesign(JSON.stringify(document));

    // The document is rejected before it can reach the renderer at all.
    expect(parsed.viewModel).toBeNull();
  });

  it('marks the host with the rendering mode', () => {
    render(DESIGN, 'card');
    expect((fixture.nativeElement as HTMLElement).classList).toContain('tpl-renderer--card');

    render(DESIGN, 'full');
    expect((fixture.nativeElement as HTMLElement).classList).toContain('tpl-renderer--full');
  });

  it('passes the brand name to the header and footer', () => {
    const parsed = parseWebsiteTemplateDesign(DESIGN);

    fixture.componentRef.setInput('viewModel', parsed.viewModel);
    fixture.componentRef.setInput('brandName', 'Coastal Table');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Coastal Table');
  });

  it('falls back safely when the design configuration is missing', () => {
    const parsed = parseWebsiteTemplateDesign(null);

    expect(parsed.viewModel).toBeNull();
    expect(parsed.error).toContain('does not provide a design preview');

    // Nothing is rendered when there is no validated design to render.
    expect(el('app-renderer-header')).toBeNull();
    expect(el('app-renderer-hero')).toBeNull();
  });
});
