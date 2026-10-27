import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Router, Routes } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { TemplateCatalogue } from './template-catalogue';
import { WebsiteService } from '../../../websites/services/website.service';
import { AuthorizationService } from '../../../../core/services/authorization.service';
import type { ApiResponse } from '../../../../core/models/api-response.model';
import type { WebsiteTemplateDto } from '../../../websites/models/website-template.model';

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
  tags: ['desi'],
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
      hero: 'centered',
      menu: 'editorial-list',
      gallery: 'mosaic',
      footer: 'single-column',
      buttons: 'rounded',
      corners: 'soft'
    },
    sections: [{ type: 'hero', enabled: true, order: 1 }]
  },
  previewContent: {
    eyebrow: 'Slow-cooked classics',
    heroTitle: 'Desi Flavours, Daily.',
    heroDescription: 'Home-style cooking.',
    primaryActionLabel: 'View Menu',
    sampleDishes: [{ name: 'Chicken Karahi', price: 'PKR 950' }]
  }
});

function template(
  id: string,
  name: string,
  overrides: Partial<WebsiteTemplateDto> = {}
): WebsiteTemplateDto {
  return {
    id,
    name,
    description: `${name} description`,
    templateKey: name.toLowerCase().replace(/\s+/g, '-'),
    previewImageFileId: null,
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    designConfigurationJson: DESIGN,
    ...overrides
  };
}

function apiSuccess(data: WebsiteTemplateDto[]): ApiResponse<WebsiteTemplateDto[]> {
  return { success: true, data, errorCode: null, message: null, errors: null, traceId: null };
}

/** Reads private-ish component state through the DOM for assertions. */
function renderState(fixture: { nativeElement: HTMLElement }): string {
  return (fixture.nativeElement as HTMLElement).textContent ?? '';
}

describe('TemplateCatalogue', () => {
  let getTemplatesCallCount = 0;
  let templatesResponse: ApiResponse<WebsiteTemplateDto[]> | null = null;
  let templatesError: unknown = null;
  const websiteServiceSpy = {
    getTemplates: vi.fn(() => {
      getTemplatesCallCount += 1;

      if (templatesError) {
        return throwError(() => templatesError);
      }

      return of(templatesResponse ?? apiSuccess([]));
    })
  };

  beforeEach(() => {
    getTemplatesCallCount = 0;
    templatesResponse = null;
    templatesError = null;

    const routes: Routes = [
      { path: 'templates', loadComponent: () => import('./template-catalogue').then(m => m.TemplateCatalogue) },
      // Placeholder target used by the catalogue's preview navigation until
      // the dedicated preview page exists; mirrors app.routes.ts.
      { path: 'templates/:id/preview', redirectTo: 'templates' }
    ];

    TestBed.configureTestingModule({
      imports: [RouterTestingModule.withRoutes(routes), HttpClientTestingModule],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        { provide: WebsiteService, useValue: websiteServiceSpy },
        {
          provide: AuthorizationService,
          useValue: { hasPermission: () => true, isAuthenticated: () => true }
        }
      ]
    });
  });

  async function createComponent() {
    const fixture = TestBed.createComponent(TemplateCatalogue);
    fixture.detectChanges();
    await fixture.whenStable();

    return fixture;
  }

  it('loads every template through WebsiteService exactly once on init', async () => {
    templatesResponse = apiSuccess([
      template('t1', 'Napoli'),
      template('t2', 'Karachi Kitchen', { designConfigurationJson: SECOND_DESIGN })
    ]);

    const fixture = await createComponent();

    expect(getTemplatesCallCount).toBe(1);
    expect(renderState(fixture)).toContain('Napoli');
    expect(renderState(fixture)).toContain('Karachi Kitchen');
  });

  it('sorts entries by declared displayOrder, then by name', async () => {
    templatesResponse = apiSuccess([
      template('t3', 'Zaika', { designConfigurationJson: DESIGN }), // order 3
      template('t1', 'Alpha Desi', { designConfigurationJson: SECOND_DESIGN }), // order 1
      template('t2', 'Beta Desi', { designConfigurationJson: SECOND_DESIGN }) // order 1
    ]);

    const fixture = await createComponent();
    const names = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.picker-name')
    ).map(node => node.textContent?.trim());

    expect(names).toEqual(['Alpha Desi', 'Beta Desi', 'Zaika']);
  });

  it('hides inactive templates without dropping the rest', async () => {
    templatesResponse = apiSuccess([
      template('t1', 'Napoli'),
      template('t2', 'Retired Design', { isActive: false })
    ]);

    const fixture = await createComponent();
    const text = renderState(fixture);

    expect(text).toContain('Napoli');
    expect(text).not.toContain('Retired Design');
  });

  it('keeps templates with malformed configuration visible and flags them', async () => {
    templatesResponse = apiSuccess([
      template('t1', 'Broken Config', { designConfigurationJson: '{not json' }),
      template('t2', 'Null Config', { designConfigurationJson: null })
    ]);

    const fixture = await createComponent();
    const text = renderState(fixture);

    expect(text).toContain('Broken Config');
    expect(text).toContain('Null Config');
    expect(text).toContain('Preview unavailable');
    expect(text).toContain('configuration that could not be read');
  });

  it('shows the empty state when the catalogue returns no active templates', async () => {
    templatesResponse = apiSuccess([]);

    const fixture = await createComponent();

    expect(renderState(fixture)).toContain('No designs are available yet.');
  });

  it('surfaces envelope failures with a working retry', async () => {
    templatesResponse = {
      success: false,
      data: null,
      errorCode: null,
      message: 'Catalogue offline',
      errors: null,
      traceId: null
    };

    const fixture = await createComponent();
    const text = renderState(fixture);

    expect(text).toContain('Catalogue offline');

    templatesResponse = apiSuccess([template('t1', 'Napoli')]);

    const retryButton = (fixture.nativeElement as HTMLElement).querySelector(
      '.state-panel-error button'
    ) as HTMLButtonElement | null;
    expect(retryButton).toBeTruthy();

    retryButton!.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(getTemplatesCallCount).toBe(2);
    expect(renderState(fixture)).toContain('Napoli');
  });

  it('handles HTTP errors through the error handler and offers retry', async () => {
    templatesError = new Error('network down');

    const fixture = await createComponent();

    expect(renderState(fixture)).toContain('Templates could not be loaded');

    templatesError = null;
    templatesResponse = apiSuccess([template('t1', 'Napoli')]);

    const retryButton = (fixture.nativeElement as HTMLElement).querySelector(
      '.state-panel-error button'
    ) as HTMLButtonElement | null;
    retryButton!.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(renderState(fixture)).toContain('Napoli');
  });

  it('navigates to the dedicated preview route for the selected template id', async () => {
    templatesResponse = apiSuccess([template('t1', 'Napoli')]);

    const fixture = await createComponent();
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const previewButton = (fixture.nativeElement as HTMLElement).querySelector(
      '.picker-preview'
    ) as HTMLButtonElement | null;
    expect(previewButton).toBeTruthy();

    previewButton!.click();
    fixture.detectChanges();

    expect(navigateSpy).toHaveBeenCalledWith(['/templates', 't1', 'preview'], {
      queryParams: { from: 'catalogue' }
    });
  });

  it('uses the same preview navigation when the card itself is selected', async () => {
    templatesResponse = apiSuccess([template('t1', 'Napoli')]);

    const fixture = await createComponent();
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const selectButton = (fixture.nativeElement as HTMLElement).querySelector(
      '.picker-select'
    ) as HTMLButtonElement | null;
    expect(selectButton).toBeTruthy();

    selectButton!.click();
    fixture.detectChanges();

    expect(navigateSpy).toHaveBeenCalledWith(['/templates', 't1', 'preview'], {
      queryParams: { from: 'catalogue' }
    });
  });
});
