import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { TemplateShowcase } from './template-showcase';
import { WebsiteService } from '../../../websites/services/website.service';
import type { ApiResponse } from '../../../../core/models/api-response.model';
import type { PublicWebsiteTemplateDto } from '../../../websites/models/website-template.model';

function design(displayOrder: number, category: string): string {
  return JSON.stringify({
    schemaVersion: 1,
    category,
    tags: [category.toLowerCase()],
    featured: displayOrder === 1,
    displayOrder,
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
      eyebrow: 'Fresh and hot',
      heroTitle: 'Big Slices.',
      heroDescription: 'Wood-fired bases.',
      primaryActionLabel: 'View Menu',
      sampleDishes: [{ name: 'Margherita', price: 'PKR 1,250' }]
    }
  });
}

/**
 * A public catalogue entry has exactly the five fields returned by
 * `GET api/v1/public/website-templates` — no isActive/createdAt/preview image.
 */
function template(
  id: string,
  name: string,
  displayOrder = 1,
  overrides: Partial<PublicWebsiteTemplateDto> = {}
): PublicWebsiteTemplateDto {
  return {
    id,
    name,
    description: `${name} description`,
    templateKey: name.toLowerCase().replace(/\s+/g, '-'),
    designConfigurationJson: design(displayOrder, 'Fast casual'),
    ...overrides
  };
}

function apiSuccess(
  data: PublicWebsiteTemplateDto[]
): ApiResponse<PublicWebsiteTemplateDto[]> {
  return { success: true, data, errorCode: null, message: null, errors: null, traceId: null };
}

describe('TemplateShowcase', () => {
  let publicTemplatesCalls = 0;
  let tenantTemplatesCalls = 0;
  let templatesResponse: ApiResponse<PublicWebsiteTemplateDto[]> | null = null;
  let templatesError: unknown = null;

  const websiteServiceSpy = {
    getPublicTemplates: vi.fn(() => {
      publicTemplatesCalls += 1;

      if (templatesError) {
        return throwError(() => templatesError);
      }

      return of(templatesResponse ?? apiSuccess([]));
    }),
    getTemplates: vi.fn(() => {
      tenantTemplatesCalls += 1;

      return of(apiSuccess([]));
    })
  };

  beforeEach(async () => {
    publicTemplatesCalls = 0;
    tenantTemplatesCalls = 0;
    templatesResponse = null;
    templatesError = null;

    TestBed.resetTestingModule();

    await TestBed.configureTestingModule({
      imports: [TemplateShowcase],
      providers: [
        provideRouter([]),
        { provide: WebsiteService, useValue: websiteServiceSpy }
      ]
    }).compileComponents();
  });

  async function createComponent(): Promise<ComponentFixture<TemplateShowcase>> {
    const fixture = TestBed.createComponent(TemplateShowcase);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    return fixture;
  }

  function el<T extends Element = HTMLElement>(
    fixture: ComponentFixture<TemplateShowcase>,
    selector: string
  ): T | null {
    return (fixture.nativeElement as HTMLElement).querySelector(selector) as T | null;
  }

  function names(fixture: ComponentFixture<TemplateShowcase>): string[] {
    return Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.tpl-name')
    ).map(node => node.textContent?.trim() ?? '');
  }

  function text(fixture: ComponentFixture<TemplateShowcase>): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  it('loads the anonymous public catalogue, never the protected tenant catalogue', async () => {
    templatesResponse = apiSuccess([template('t1', 'Alpha')]);

    const fixture = await createComponent();

    expect(publicTemplatesCalls).toBe(1);
    expect(tenantTemplatesCalls).toBe(0);
    expect(text(fixture)).toContain('Alpha');
  });

  it('shows at most four templates ordered by displayOrder then name', async () => {
    templatesResponse = apiSuccess([
      template('t5', 'Echo', 5),
      template('t2', 'Bravo', 2),
      template('t1', 'Alpha', 2),
      template('t3', 'Charlie', 3),
      template('t6', 'Foxtrot', 4)
    ]);

    const fixture = await createComponent();

    expect(names(fixture)).toEqual(['Alpha', 'Bravo', 'Charlie', 'Foxtrot']);
  });

  it('renders a real renderer thumbnail for every card', async () => {
    templatesResponse = apiSuccess([
      template('t1', 'Alpha', 1),
      template('t2', 'Bravo', 2)
    ]);

    const fixture = await createComponent();

    expect(
      (fixture.nativeElement as HTMLElement).querySelectorAll('app-template-renderer')
    ).toHaveLength(2);
  });

  it('shows the empty state when the public catalogue is empty', async () => {
    templatesResponse = apiSuccess([]);

    const fixture = await createComponent();

    expect(text(fixture)).toContain('No templates are available yet');
  });

  it('treats a 401 as a load failure with retry, not as a sign-in requirement', async () => {
    templatesError = new HttpErrorResponse({ status: 401, error: {} });

    const fixture = await createComponent();

    const content = text(fixture);
    expect(content).toContain('Templates could not be loaded');
    expect(content).not.toContain('signed-in restaurant accounts');
    expect(el(fixture, 'a[href="/login"]')).toBeNull();
    expect(el(fixture, '.templates-state-actions button')).toBeTruthy();
  });

  it('surfaces other failures and reloads on retry', async () => {
    templatesError = new Error('network down');

    const fixture = await createComponent();

    expect(text(fixture)).toContain('Templates could not be loaded');

    templatesError = null;
    templatesResponse = apiSuccess([template('t1', 'Alpha')]);

    el<HTMLButtonElement>(fixture, '.templates-state-actions button')?.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(publicTemplatesCalls).toBe(2);
    expect(text(fixture)).toContain('Alpha');
  });

  it('opens the dedicated preview route for the template id', async () => {
    templatesResponse = apiSuccess([template('t1', 'Alpha')]);

    const fixture = await createComponent();
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    el<HTMLButtonElement>(fixture, '.tpl-media')?.click();
    fixture.detectChanges();

    expect(navigateSpy).toHaveBeenCalledWith(['/templates', 't1', 'preview']);
  });

  it('starts registration from the use-template action', async () => {
    templatesResponse = apiSuccess([template('t1', 'Alpha')]);

    const fixture = await createComponent();
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll(
      '.tpl-actions app-button button'
    );

    expect(buttons).toHaveLength(2);
    (buttons[1] as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(navigateSpy).toHaveBeenCalledWith(['/register']);
  });
});
