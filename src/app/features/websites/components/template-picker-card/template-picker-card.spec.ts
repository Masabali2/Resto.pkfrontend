import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TemplatePickerCard } from './template-picker-card';
import { parseWebsiteTemplateDesign } from '../../utils/website-template-design.util';
import type { WebsiteTemplateDto } from '../../models/website-template.model';

const DESIGN = JSON.stringify({
  schemaVersion: 1,
  category: 'Fine dining',
  tags: ['premium'],
  featured: true,
  displayOrder: 2,
  design: {
    palette: {
      background: '#F7F2EA',
      surface: '#FFFFFF',
      text: '#1C1B1A',
      mutedText: '#6B6560',
      primary: '#2E2A27',
      accent: '#B0672A',
      border: '#E3D9CB'
    },
    typography: { headingFont: 'serif-editorial', bodyFont: 'sans-modern' },
    layout: {
      header: 'centered',
      hero: 'cinematic',
      menu: 'editorial-list',
      gallery: 'strip',
      footer: 'simple',
      buttons: 'outline',
      corners: 'sharp'
    },
    sections: [
      { type: 'header', enabled: true, order: 1 },
      { type: 'hero', enabled: true, order: 2 }
    ]
  },
  previewContent: {
    eyebrow: 'An evening',
    heroTitle: 'Ember, Oak & Patience',
    heroDescription: 'Seasonal plates.',
    primaryActionLabel: 'Reserve a Table',
    sampleDishes: [{ name: 'Dry-Aged Ribeye', price: 'PKR 5,400' }]
  }
});

function template(overrides: Partial<WebsiteTemplateDto> = {}): WebsiteTemplateDto {
  return {
    id: 'template-1',
    name: 'Ember & Oak',
    description: 'Fine dining with a cinematic hero.',
    templateKey: 'ember-oak',
    previewImageFileId: null,
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    designConfigurationJson: DESIGN,
    ...overrides
  };
}

describe('TemplatePickerCard', () => {
  let fixture: ComponentFixture<TemplatePickerCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TemplatePickerCard]
    }).compileComponents();

    fixture = TestBed.createComponent(TemplatePickerCard);
  });

  function el<T extends Element = HTMLElement>(selector: string): T | null {
    return fixture.nativeElement.querySelector(selector) as T | null;
  }

  it('renders the template name, description and category', () => {
    fixture.componentRef.setInput('template', template());
    fixture.componentRef.setInput(
      'design',
      parseWebsiteTemplateDesign(DESIGN).viewModel
    );
    fixture.detectChanges();

    expect(el('.picker-name')?.textContent).toContain('Ember & Oak');
    expect(el('.picker-desc')?.textContent).toContain('cinematic hero');
    expect(el('.picker-tag-category')?.textContent).toContain('Fine dining');
  });

  it('renders the generic renderer preview instead of an emoji placeholder', () => {
    fixture.componentRef.setInput('template', template());
    fixture.componentRef.setInput(
      'design',
      parseWebsiteTemplateDesign(DESIGN).viewModel
    );
    fixture.detectChanges();

    expect(el('app-template-renderer')).toBeTruthy();
    expect(el('.picker-fallback')).toBeNull();
  });

  it('falls back safely when the design configuration is missing', () => {
    fixture.componentRef.setInput('template', template({ designConfigurationJson: null }));
    fixture.componentRef.setInput('design', null);
    fixture.componentRef.setInput('designError', 'This template does not provide a design preview yet.');
    fixture.detectChanges();

    expect(el('app-template-renderer')).toBeNull();
    expect(el('.picker-fallback')).toBeTruthy();
    expect(el('.picker-warning')?.textContent).toContain('does not provide a design preview');
  });

  it('emits the select intent when the card is clicked', () => {
    fixture.componentRef.setInput('template', template());
    fixture.detectChanges();

    let selected = 0;
    fixture.componentInstance.select.subscribe(() => selected++);

    el<HTMLButtonElement>('.picker-select')?.click();
    fixture.detectChanges();

    expect(selected).toBe(1);
  });

  it('does not emit the select intent twice when already selected', () => {
    fixture.componentRef.setInput('template', template());
    fixture.componentRef.setInput('selected', true);
    fixture.detectChanges();

    let selected = 0;
    fixture.componentInstance.select.subscribe(() => selected++);

    el<HTMLButtonElement>('.picker-select')?.click();
    fixture.detectChanges();

    expect(selected).toBe(0);
  });

  it('emits a separate preview intent that never selects the template', () => {
    fixture.componentRef.setInput('template', template());
    fixture.detectChanges();

    let selected = 0;
    let previewed = 0;
    fixture.componentInstance.select.subscribe(() => selected++);
    fixture.componentInstance.preview.subscribe(() => previewed++);

    el<HTMLButtonElement>('.picker-preview')?.click();
    fixture.detectChanges();

    expect(previewed).toBe(1);
    expect(selected).toBe(0);
  });

  it('exposes an accessible selected state with a non-colour indicator', () => {
    fixture.componentRef.setInput('template', template());
    fixture.componentRef.setInput('selected', true);
    fixture.detectChanges();

    expect(el('.picker-select')?.getAttribute('aria-pressed')).toBe('true');
    expect(el('.picker-check')).toBeTruthy();
    expect(el('.picker-state')?.textContent).toContain('Selected');
  });

  it('marks the featured badge only for featured designs', () => {
    fixture.componentRef.setInput('template', template());
    fixture.componentRef.setInput(
      'design',
      parseWebsiteTemplateDesign(DESIGN).viewModel
    );
    fixture.detectChanges();

    expect(el('.picker-featured')).toBeTruthy();
  });
});
