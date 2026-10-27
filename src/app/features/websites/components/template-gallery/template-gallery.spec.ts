import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TemplateGallery } from './template-gallery';
import { buildCatalogueItem } from '../../utils/website-template-catalogue.util';
import type { WebsiteTemplateDto } from '../../models/website-template.model';

const DESIGN = JSON.stringify({
  schemaVersion: 1,
  category: 'Pizza / Fast casual',
  tags: ['pizza', 'delivery'],
  featured: true,
  displayOrder: 3,
  design: {
    palette: {
      background: '#FAF7F2',
      surface: '#FFFFFF',
      text: '#22252A',
      mutedText: '#636B73',
      primary: '#D7263D',
      accent: '#F5A524',
      border: '#E6DFD6'
    },
    typography: { headingFont: 'sans-bold', bodyFont: 'sans-modern' },
    layout: {
      header: 'split',
      hero: 'image-led',
      menu: 'compact-cards',
      gallery: 'grid',
      footer: 'multi-column',
      buttons: 'pill',
      corners: 'sharp'
    },
    sections: [{ type: 'hero', enabled: true, order: 1 }]
  },
  previewContent: {
    eyebrow: 'Sliced, stacked and shipped hot',
    heroTitle: 'Big Slices. Zero Fuss.',
    heroDescription: 'Wood-fired bases.',
    primaryActionLabel: 'Order Now',
    sampleDishes: [{ name: 'Margherita Sourdough', price: 'PKR 1,250' }]
  }
});

const SECOND_DESIGN = JSON.stringify({
  schemaVersion: 1,
  category: 'South Asian / Desi',
  tags: ['desi', 'traditional'],
  featured: false,
  displayOrder: 1,
  design: {
    palette: {
      background: '#FFF8EE',
      surface: '#FFFFFF',
      text: '#24352A',
      mutedText: '#667368',
      primary: '#24563A',
      accent: '#D99027',
      border: '#E9DFCE'
    },
    typography: { headingFont: 'serif-editorial', bodyFont: 'sans-humanist' },
    layout: {
      header: 'centered',
      hero: 'split',
      menu: 'featured-cards',
      gallery: 'masonry',
      footer: 'multi-column',
      buttons: 'solid',
      corners: 'soft'
    },
    sections: [{ type: 'hero', enabled: true, order: 1 }]
  },
  previewContent: {
    eyebrow: 'Authentic flavours',
    heroTitle: 'A Taste of Tradition',
    heroDescription: 'Comforting dishes.',
    primaryActionLabel: 'Explore Our Menu',
    sampleDishes: [{ name: 'Signature Karahi', price: 'PKR 1,650' }]
  }
});

function template(id: string, name: string, key: string): WebsiteTemplateDto {
  return {
    id,
    name,
    description: `${name} description`,
    templateKey: key,
    previewImageFileId: null,
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    designConfigurationJson: DESIGN
  };
}

function secondTemplate(id: string, name: string, key: string): WebsiteTemplateDto {
  return {
    ...template(id, name, key),
    designConfigurationJson: SECOND_DESIGN
  };
}

describe('TemplateGallery', () => {
  let fixture: ComponentFixture<TemplateGallery>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TemplateGallery]
    }).compileComponents();

    fixture = TestBed.createComponent(TemplateGallery);
  });

  function el<T extends Element = HTMLElement>(selector: string): T | null {
    return fixture.nativeElement.querySelector(selector) as T | null;
  }

  function all(selector: string): Element[] {
    return Array.from(fixture.nativeElement.querySelectorAll(selector));
  }

  function setItems(): void {
    fixture.componentRef.setInput(
      'items',
      [
        buildCatalogueItem(template('a', 'Urban Slice', 'urban-slice')),
        buildCatalogueItem(secondTemplate('b', 'Spice Garden', 'spice-garden'))
      ]
    );
    fixture.detectChanges();
  }

  it('renders one card per catalogue entry', () => {
    setItems();

    expect(all('app-template-picker-card').length).toBe(2);
  });

  it('shows a loading state', () => {
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();

    expect(el('.gallery-status')).toBeTruthy();
    expect(el('.gallery-status')?.getAttribute('role')).toBe('status');
  });

  it('shows an error state with a retry action', () => {
    fixture.componentRef.setInput('error', 'Unable to load templates.');
    fixture.detectChanges();

    expect(el('.gallery-error')).toBeTruthy();
    expect(el('.gallery-error')?.getAttribute('role')).toBe('alert');

    let retried = 0;
    fixture.componentInstance.retry.subscribe(() => retried++);
    el<HTMLButtonElement>('.gallery-retry')?.click();

    expect(retried).toBe(1);
  });

  it('filters by template name', () => {
    setItems();

    const input = el<HTMLInputElement>('#template-search');
    input!.value = 'spice';
    input!.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(all('app-template-picker-card').length).toBe(1);
    expect(el('.picker-name')?.textContent).toContain('Spice Garden');
  });

  it('filters by category and tag', () => {
    setItems();

    const input = el<HTMLInputElement>('#template-search');
    input!.value = 'delivery';
    input!.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(all('app-template-picker-card').length).toBe(1);
    expect(el('.picker-name')?.textContent).toContain('Urban Slice');
  });

  it('shows an empty state with a clear-filters action', () => {
    setItems();

    const input = el<HTMLInputElement>('#template-search');
    input!.value = 'nothing-matches-this';
    input!.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(el('.gallery-empty')).toBeTruthy();
    expect(el('.gallery-empty')?.textContent).toContain('No designs match');

    el<HTMLButtonElement>('.gallery-retry')?.click();
    fixture.detectChanges();

    expect(all('app-template-picker-card').length).toBe(2);
  });

  it('exposes category filters derived from the catalogue', () => {
    setItems();

    const chips = all('.gallery-chip');
    expect(chips.length).toBeGreaterThan(1);
    expect(chips[0]?.textContent).toContain('All designs');
  });

  it('marks the selected card', () => {
    setItems();
    fixture.componentRef.setInput('selectedId', 'a');
    fixture.detectChanges();

    const selected = all('.picker-card-selected');
    expect(selected.length).toBe(1);
  });

  it('emits the template id for selection and preview', () => {
    setItems();

    const selected: string[] = [];
    const previewed: string[] = [];
    fixture.componentInstance.select.subscribe(id => selected.push(id));
    fixture.componentInstance.preview.subscribe(id => previewed.push(id));

    el<HTMLButtonElement>('.picker-select')?.click();
    el<HTMLButtonElement>('.picker-preview')?.click();
    fixture.detectChanges();

    expect(selected).toEqual(['a']);
    expect(previewed).toEqual(['a']);
  });
});
