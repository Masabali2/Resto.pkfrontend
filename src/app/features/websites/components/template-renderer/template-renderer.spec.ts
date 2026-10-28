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

  describe('configured images', () => {
    const IMAGE_ASSETS = [
      {
        assetId: 'sg-hero',
        url: '/assets/images/SpiceGarden/spicegarden1.png',
        alt: 'A shared feast on a linen table',
        width: 2400,
        height: 1792
      },
      {
        assetId: 'sg-about',
        url: '/assets/images/SpiceGarden/spicegarden2.png',
        alt: 'A chef garnishing a copper karahi',
        width: 2400,
        height: 1792
      },
      {
        assetId: 'sg-gallery-first',
        url: '/assets/images/SpiceGarden/spicegarden8.png',
        alt: 'A softly lit dining room',
        width: 2528,
        height: 1696
      },
      {
        assetId: 'sg-gallery-second',
        url: '/assets/images/SpiceGarden/spicegarden3.png',
        alt: 'Brass bowls of spices',
        width: 2528,
        height: 1696
      }
    ];

    function imageDesign(): string {
      const document = JSON.parse(DESIGN);

      document.design.sections = [
        { type: 'hero', enabled: true, order: 1 },
        { type: 'about', enabled: true, order: 2 },
        { type: 'gallery', enabled: true, order: 3 }
      ];
      document.assets = IMAGE_ASSETS;
      document.previewContent = {
        ...document.previewContent,
        heroAssetId: 'sg-hero',
        aboutAssetId: 'sg-about',
        galleryAssetIds: ['sg-gallery-first', 'sg-gallery-second']
      };

      return JSON.stringify(document);
    }

    it('renders the hero, about and gallery images from the registry', () => {
      render(imageDesign());

      const hero = el<HTMLImageElement>('app-renderer-hero img');
      const about = el<HTMLImageElement>('app-renderer-about img');
      const gallery = Array.from(
        fixture.nativeElement.querySelectorAll(
          'app-renderer-gallery .tpl-gallery-tile--image img'
        ) as NodeListOf<HTMLImageElement>
      );

      expect(hero?.getAttribute('src')).toBe(IMAGE_ASSETS[0].url);
      expect(hero?.getAttribute('alt')).toBe(IMAGE_ASSETS[0].alt);
      expect(hero?.getAttribute('width')).toBe('2400');
      expect(hero?.getAttribute('height')).toBe('1792');

      expect(about?.getAttribute('src')).toBe(IMAGE_ASSETS[1].url);
      expect(about?.getAttribute('alt')).toBe(IMAGE_ASSETS[1].alt);

      expect(gallery.map(image => image.getAttribute('src'))).toEqual([
        IMAGE_ASSETS[2].url,
        IMAGE_ASSETS[3].url
      ]);
      expect(gallery.map(image => image.getAttribute('alt'))).toEqual([
        IMAGE_ASSETS[2].alt,
        IMAGE_ASSETS[3].alt
      ]);
    });

    it('loads the hero eagerly only in the full preview', () => {
      render(imageDesign(), 'card');
      const cardHero = el<HTMLImageElement>('app-renderer-hero img');

      expect(cardHero?.getAttribute('loading')).toBe('lazy');
      expect(cardHero?.getAttribute('fetchpriority')).toBeNull();

      render(imageDesign(), 'full');
      const fullHero = el<HTMLImageElement>('app-renderer-hero img');

      expect(fullHero?.getAttribute('loading')).toBe('eager');
      expect(fullHero?.getAttribute('fetchpriority')).toBe('high');
    });

    it('lazy-loads the about and gallery images', () => {
      render(imageDesign(), 'full');

      expect(el('app-renderer-about img')?.getAttribute('loading')).toBe('lazy');

      const gallery = Array.from(
        fixture.nativeElement.querySelectorAll(
          'app-renderer-gallery .tpl-gallery-tile--image img'
        ) as NodeListOf<HTMLImageElement>
      );

      expect(gallery.map(image => image.getAttribute('loading'))).toEqual([
        'lazy',
        'lazy'
      ]);
    });

    it('restores the decorative hero visual when the hero image fails', () => {
      render(imageDesign());

      const hero = el<HTMLImageElement>('app-renderer-hero img');

      expect(hero).toBeTruthy();
      expect(el('app-renderer-hero .tpl-visual-plate')).toBeNull();

      hero?.dispatchEvent(new Event('error'));
      fixture.detectChanges();

      expect(el('app-renderer-hero img')).toBeNull();
      expect(el('app-renderer-hero .tpl-visual-plate')).toBeTruthy();
      expect(el('app-renderer-hero .tpl-hero-visual--image')).toBeNull();
    });

    it('restores the decorative about visual when the about image fails', () => {
      render(imageDesign());

      el<HTMLImageElement>('app-renderer-about img')?.dispatchEvent(new Event('error'));
      fixture.detectChanges();

      expect(el('app-renderer-about img')).toBeNull();
      expect(el('app-renderer-about .tpl-about-disc')).toBeTruthy();
    });

    it('removes only the failed gallery image and keeps the declared order', () => {
      render(imageDesign());

      const images = Array.from(
        fixture.nativeElement.querySelectorAll(
          'app-renderer-gallery .tpl-gallery-tile--image img'
        ) as NodeListOf<HTMLImageElement>
      );

      images[0].dispatchEvent(new Event('error'));
      fixture.detectChanges();

      const remaining = Array.from(
        fixture.nativeElement.querySelectorAll(
          'app-renderer-gallery .tpl-gallery-tile--image img'
        ) as NodeListOf<HTMLImageElement>
      );

      expect(remaining.map(image => image.getAttribute('src'))).toEqual([
        IMAGE_ASSETS[3].url
      ]);
    });

    it('falls back to the decorative gallery tiles when every image fails', () => {
      render(imageDesign());

      const images = Array.from(
        fixture.nativeElement.querySelectorAll(
          'app-renderer-gallery .tpl-gallery-tile--image img'
        ) as NodeListOf<HTMLImageElement>
      );

      images.forEach(image => image.dispatchEvent(new Event('error')));
      fixture.detectChanges();

      expect(el('app-renderer-gallery img')).toBeNull();
      expect(
        fixture.nativeElement.querySelectorAll(
          'app-renderer-gallery .tpl-gallery-tile:not(.tpl-gallery-tile--image)'
        ).length
      ).toBeGreaterThan(0);
    });

    it('renders a second template registry through the same resolver', () => {
      const document = JSON.parse(DESIGN);
      const assets = [
        {
          assetId: 'urban-slice-urban-slice1-png',
          url: '/assets/images/Urban-Slice/urban-slice1.png',
          alt: 'A slice of pepperoni pizza',
          width: 1120,
          height: 400
        },
        {
          assetId: 'urban-slice-urban-slice2-png',
          url: '/assets/images/Urban-Slice/urban-slice2.png',
          alt: 'A crispy chicken burger',
          width: 168,
          height: 180
        }
      ];

      document.design.sections = [
        { type: 'hero', enabled: true, order: 1 },
        { type: 'gallery', enabled: true, order: 2 }
      ];
      document.assets = assets;
      document.previewContent = {
        ...document.previewContent,
        heroAssetId: 'urban-slice-urban-slice1-png',
        galleryAssetIds: ['urban-slice-urban-slice2-png']
      };

      render(JSON.stringify(document));

      expect(el<HTMLImageElement>('app-renderer-hero img')?.getAttribute('src')).toBe(
        assets[0].url
      );
      expect(
        el<HTMLImageElement>('app-renderer-gallery img')?.getAttribute('src')
      ).toBe(assets[1].url);
    });

    it('renders no images for a template without an asset registry', () => {
      render(DESIGN);

      expect(el('app-renderer-hero img')).toBeNull();
      expect(el('app-renderer-about img')).toBeNull();
      expect(el('app-renderer-gallery img')).toBeNull();
      expect(el('app-renderer-hero .tpl-visual-plate')).toBeTruthy();
    });
  });
});
