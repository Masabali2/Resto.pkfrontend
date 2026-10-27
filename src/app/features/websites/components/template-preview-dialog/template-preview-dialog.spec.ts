import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TemplatePreviewDialog } from './template-preview-dialog';
import { parseWebsiteTemplateDesign } from '../../utils/website-template-design.util';
import type { WebsiteTemplateDto } from '../../models/website-template.model';

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
    sections: [{ type: 'hero', enabled: true, order: 1 }]
  },
  previewContent: {
    eyebrow: 'Landed this morning',
    heroTitle: 'The Coast, Served Daily',
    heroDescription: 'Line-caught fish.',
    primaryActionLabel: "View Today's Catch",
    sampleDishes: [{ name: 'Grilled King Fish', price: 'PKR 2,450' }]
  }
});

const TEMPLATE: WebsiteTemplateDto = {
  id: 'template-coastal',
  name: 'Coastal Table',
  description: 'Airy coastal design.',
  templateKey: 'coastal-table',
  previewImageFileId: null,
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
  designConfigurationJson: DESIGN
};

describe('TemplatePreviewDialog', () => {
  let fixture: ComponentFixture<TemplatePreviewDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TemplatePreviewDialog]
    }).compileComponents();

    fixture = TestBed.createComponent(TemplatePreviewDialog);
    fixture.componentRef.setInput('template', TEMPLATE);
    fixture.componentRef.setInput('design', parseWebsiteTemplateDesign(DESIGN).viewModel);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  function el<T extends Element = HTMLElement>(selector: string): T | null {
    return fixture.nativeElement.querySelector(selector) as T | null;
  }

  it('uses accessible dialog semantics', () => {
    const dialog = el('.preview-panel');

    expect(dialog?.getAttribute('role')).toBe('dialog');
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    expect(dialog?.getAttribute('aria-labelledby')).toBeTruthy();
    expect(el('#template-preview-title-template-coastal')?.textContent).toContain('Coastal Table');
  });

  it('renders the generic renderer in the larger mode', () => {
    expect(el('app-template-renderer')).toBeTruthy();
  });

  it('emits the close intent when the close button is used', () => {
    let closed = 0;
    fixture.componentInstance.closed.subscribe(() => closed++);

    el<HTMLButtonElement>('.preview-close')?.click();
    fixture.detectChanges();

    expect(closed).toBe(1);
  });

  it('emits the close intent when Escape is pressed', () => {
    let closed = 0;
    fixture.componentInstance.closed.subscribe(() => closed++);

    el('.preview-panel')?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    );
    fixture.detectChanges();

    expect(closed).toBe(1);
  });

  it('emits the use-template intent without closing on its own', () => {
    let used = 0;
    let closed = 0;
    fixture.componentInstance.useTemplate.subscribe(() => used++);
    fixture.componentInstance.closed.subscribe(() => closed++);

    el<HTMLButtonElement>('.preview-primary')?.click();
    fixture.detectChanges();

    expect(used).toBe(1);
    expect(closed).toBe(0);
  });

  it('shows an actionable message when no design preview exists', async () => {
    fixture.componentRef.setInput('design', null);
    fixture.componentRef.setInput('designError', 'This template does not provide a design preview yet.');
    fixture.detectChanges();

    expect(el('.preview-empty')?.textContent).toContain('does not provide a design preview');
  });
});
