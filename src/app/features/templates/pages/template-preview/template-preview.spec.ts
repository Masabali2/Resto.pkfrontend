import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import {
  ActivatedRoute,
  convertToParamMap,
  provideRouter,
  Router
} from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { TemplatePreview } from './template-preview';
import { WebsiteService } from '../../../websites/services/website.service';
import { AuthorizationService } from '../../../../core/services/authorization.service';
import { ActiveRestaurantStateService } from '../../../../core/services/active-restaurant-state.service';
import type { ApiResponse } from '../../../../core/models/api-response.model';
import type { PublicWebsiteTemplateDto } from '../../../websites/models/website-template.model';

const DESIGN = JSON.stringify({
  schemaVersion: 1,
  category: 'Pizza / Fast casual',
  tags: ['pizza', 'delivery'],
  featured: true,
  displayOrder: 2,
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
    sections: [
      { type: 'header', enabled: true, order: 1 },
      { type: 'hero', enabled: true, order: 2 },
      { type: 'menu', enabled: true, order: 3 },
      { type: 'about', enabled: true, order: 4 },
      { type: 'gallery', enabled: true, order: 5 },
      { type: 'contact', enabled: true, order: 6 },
      { type: 'footer', enabled: true, order: 7 }
    ]
  },
  previewContent: {
    eyebrow: 'Sliced, stacked and shipped hot',
    heroTitle: 'Big Slices. Zero Fuss.',
    heroDescription: 'Wood-fired bases.',
    primaryActionLabel: 'Order Now',
    sampleDishes: [{ name: 'Margherita Sourdough', price: 'PKR 1,250' }]
  }
});

const TEMPLATE_ID = '11111111-1111-1111-1111-111111111111';

/**
 * A public catalogue entry has exactly the five fields returned by
 * `GET api/v1/public/website-templates` — no isActive/createdAt/preview image.
 */
function template(
  id: string,
  name: string,
  overrides: Partial<PublicWebsiteTemplateDto> = {}
): PublicWebsiteTemplateDto {
  return {
    id,
    name,
    description: `${name} description`,
    templateKey: name.toLowerCase().replace(/\s+/g, '-'),
    designConfigurationJson: DESIGN,
    ...overrides
  };
}

function apiSuccess(
  data: PublicWebsiteTemplateDto[]
): ApiResponse<PublicWebsiteTemplateDto[]> {
  return { success: true, data, errorCode: null, message: null, errors: null, traceId: null };
}

function apiFailure(message: string): ApiResponse<PublicWebsiteTemplateDto[]> {
  return {
    success: false,
    data: null,
    errorCode: null,
    message,
    errors: null,
    traceId: null
  };
}

describe('TemplatePreview', () => {
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

  const isAuthenticated = signal(false);
  const activeTenantId = signal<string | null>(null);
  const restaurantState = signal<'idle' | 'loading' | 'resolved' | 'empty' | 'forbidden' | 'error'>('resolved');
  const hasRestaurant = signal(true);

  const paramMap = new BehaviorSubject(convertToParamMap({ id: TEMPLATE_ID }));
  const queryParamMap = new BehaviorSubject(convertToParamMap({}));

  beforeEach(async () => {
    publicTemplatesCalls = 0;
    tenantTemplatesCalls = 0;
    templatesResponse = null;
    templatesError = null;
    isAuthenticated.set(false);
    activeTenantId.set(null);
    restaurantState.set('resolved');
    hasRestaurant.set(true);
    paramMap.next(convertToParamMap({ id: TEMPLATE_ID }));
    queryParamMap.next(convertToParamMap({}));

    TestBed.resetTestingModule();

    await TestBed.configureTestingModule({
      imports: [TemplatePreview],
      providers: [
        provideRouter([]),
        { provide: WebsiteService, useValue: websiteServiceSpy },
        {
          provide: AuthorizationService,
          useValue: {
            isAuthenticated,
            activeTenantId
          }
        },
        {
          provide: ActiveRestaurantStateService,
          useValue: {
            state: restaurantState.asReadonly(),
            hasRestaurant: hasRestaurant.asReadonly()
          }
        },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: paramMap.asObservable(),
            queryParamMap: queryParamMap.asObservable(),
            snapshot: { paramMap: paramMap.value, queryParamMap: queryParamMap.value }
          }
        }
      ]
    }).compileComponents();
  });

  async function createComponent(): Promise<ComponentFixture<TemplatePreview>> {
    const fixture = TestBed.createComponent(TemplatePreview);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    return fixture;
  }

  function el<T extends Element = HTMLElement>(
    fixture: ComponentFixture<TemplatePreview>,
    selector: string
  ): T | null {
    return (fixture.nativeElement as HTMLElement).querySelector(selector) as T | null;
  }

  function text(fixture: ComponentFixture<TemplatePreview>): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  it('renders a public catalogue template anonymously with the generic renderer', async () => {
    templatesResponse = apiSuccess([template(TEMPLATE_ID, 'Napoli')]);

    const fixture = await createComponent();

    expect(publicTemplatesCalls).toBe(1);
    expect(tenantTemplatesCalls).toBe(0);
    expect(text(fixture)).toContain('Napoli');
    expect(text(fixture)).toContain('Pizza / Fast casual');
    expect(el(fixture, 'app-template-renderer')).toBeTruthy();

    // The rendered header/footer use the real template name as the brand.
    const brand = el(fixture, '.tpl-brand');
    expect(brand?.textContent?.trim()).toBe('Napoli');
  });

  it('reloads the public catalogue when direct navigation changes the template id', async () => {
    templatesResponse = apiSuccess([
      template(TEMPLATE_ID, 'Napoli'),
      template('22222222-2222-2222-2222-222222222222', 'Tandoor')
    ]);

    const fixture = await createComponent();
    expect(text(fixture)).toContain('Napoli');

    paramMap.next(convertToParamMap({ id: '22222222-2222-2222-2222-222222222222' }));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(publicTemplatesCalls).toBe(2);
    expect(text(fixture)).toContain('Tandoor');
  });

  it('shows the not-found state for an unknown template id', async () => {
    paramMap.next(convertToParamMap({ id: 'missing-template' }));
    templatesResponse = apiSuccess([template(TEMPLATE_ID, 'Napoli')]);

    const fixture = await createComponent();

    expect(text(fixture)).toContain('Template not found');
    expect(el(fixture, 'app-template-renderer')).toBeNull();
  });

  it('surfaces envelope failures and reloads on retry', async () => {
    templatesResponse = apiFailure('Catalogue offline');

    const fixture = await createComponent();

    expect(text(fixture)).toContain('Catalogue offline');

    templatesResponse = apiSuccess([template(TEMPLATE_ID, 'Napoli')]);

    el<HTMLButtonElement>(fixture, '.state-panel-error button')?.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(publicTemplatesCalls).toBe(2);
    expect(text(fixture)).toContain('Napoli');
  });

  it('treats a 401 as a load failure with retry, not as a sign-in requirement', async () => {
    templatesError = new HttpErrorResponse({ status: 401, error: {} });

    const fixture = await createComponent();

    const content = text(fixture);
    expect(content).toContain('This template could not be loaded');
    expect(content).not.toContain('signed-in restaurant accounts');
    expect(el(fixture, 'a[href="/login"]')).toBeNull();
    expect(el(fixture, '.state-panel-error button')).toBeTruthy();
  });

  it('degrades to the existing validation fallback for an invalid design configuration', async () => {
    templatesResponse = apiSuccess([
      template(TEMPLATE_ID, 'Broken', { designConfigurationJson: '{ not json' })
    ]);

    const fixture = await createComponent();

    expect(el(fixture, 'app-template-renderer')).toBeNull();
    expect(el(fixture, '.preview-fallback')).toBeTruthy();
    expect(text(fixture)).toContain('design configuration that could not be read');
  });

  it('keeps the catalogue back link in sync without refetching the same id', async () => {
    templatesResponse = apiSuccess([template(TEMPLATE_ID, 'Napoli')]);

    const fixture = await createComponent();

    const backLink = el<HTMLAnchorElement>(fixture, '.back-link');
    expect(backLink?.getAttribute('href')).toBe('/#templates');
    expect(backLink?.textContent).toContain('Back to Home');

    queryParamMap.next(convertToParamMap({ from: 'catalogue' }));
    fixture.detectChanges();

    expect(publicTemplatesCalls).toBe(1);
    expect(el<HTMLAnchorElement>(fixture, '.back-link')?.getAttribute('href')).toBe('/templates');
    expect(text(fixture)).toContain('Back to Templates');
  });

  it('returns to the catalogue when the preview was opened from it', async () => {
    queryParamMap.next(convertToParamMap({ from: 'catalogue' }));
    templatesResponse = apiSuccess([template(TEMPLATE_ID, 'Napoli')]);

    const fixture = await createComponent();
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    el<HTMLAnchorElement>(fixture, '.back-link')?.click();
    fixture.detectChanges();

    expect(navigateSpy).toHaveBeenCalledWith(['/templates']);
  });

  it('sends guests to registration with the template id preserved', async () => {
    templatesResponse = apiSuccess([template(TEMPLATE_ID, 'Napoli')]);

    const fixture = await createComponent();
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    el<HTMLButtonElement>(fixture, '.template-actions app-button button')?.click();
    fixture.detectChanges();

    expect(navigateSpy).toHaveBeenCalledWith(['/register'], {
      queryParams: { templateId: TEMPLATE_ID }
    });
  });

  it('sends signed-in users without a workspace to workspace setup with the template id', async () => {
    templatesResponse = apiSuccess([template(TEMPLATE_ID, 'Napoli')]);
    isAuthenticated.set(true);
    activeTenantId.set(null);

    const fixture = await createComponent();
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    el<HTMLButtonElement>(fixture, '.template-actions app-button button')?.click();
    fixture.detectChanges();

    expect(navigateSpy).toHaveBeenCalledWith(['/setup', 'workspace'], {
      queryParams: { templateId: TEMPLATE_ID }
    });
  });

  it('sends signed-in users with a workspace but no restaurant to restaurant setup with the template id', async () => {
    templatesResponse = apiSuccess([template(TEMPLATE_ID, 'Napoli')]);
    isAuthenticated.set(true);
    activeTenantId.set('tenant-1');
    restaurantState.set('empty');
    hasRestaurant.set(false);

    const fixture = await createComponent();
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    el<HTMLButtonElement>(fixture, '.template-actions app-button button')?.click();
    fixture.detectChanges();

    expect(navigateSpy).toHaveBeenCalledWith(['/setup', 'restaurant'], {
      queryParams: { templateId: TEMPLATE_ID }
    });
  });

  it('sends signed-in users with workspace and restaurant to website creation with the template id', async () => {
    templatesResponse = apiSuccess([template(TEMPLATE_ID, 'Napoli')]);
    isAuthenticated.set(true);
    activeTenantId.set('tenant-1');
    restaurantState.set('resolved');
    hasRestaurant.set(true);

    const fixture = await createComponent();
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    el<HTMLButtonElement>(fixture, '.template-actions app-button button')?.click();
    fixture.detectChanges();

    expect(navigateSpy).toHaveBeenCalledWith(['/websites', 'new'], {
      queryParams: { templateId: TEMPLATE_ID }
    });
  });

  it('resizes the live stage when the viewport switcher changes', async () => {
    templatesResponse = apiSuccess([template(TEMPLATE_ID, 'Napoli')]);

    const fixture = await createComponent();

    const frame = el<HTMLElement>(fixture, '.preview-frame');
    expect(frame?.style.width).toBe('1200px');

    const mobileButton = el<HTMLButtonElement>(fixture, '.viewport-btn[aria-label*="Mobile"]');
    expect(mobileButton).toBeTruthy();

    mobileButton!.click();
    fixture.detectChanges();

    expect(el<HTMLElement>(fixture, '.preview-frame')?.style.width).toBe('375px');
    expect(mobileButton!.getAttribute('aria-pressed')).toBe('true');
  });
});
