import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, HttpRequest } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

import { CreateWebsite } from './create-website';
import { WebsiteService } from '../../services/website.service';
import { RestaurantService } from '../../../../core/services/restaurant.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { HttpErrorHandlerService } from '../../../../core/services/http-error-handler.service';
import type { WebsiteTemplateDto } from '../../models/website-template.model';
import type { ApiResponse } from '../../../../core/models/api-response.model';
import { environment } from '../../../../../environments/environment';

const TEMPLATE_ID = '3f6b0c1e-9a4d-4c2b-8f21-6d5a7e9b1c40';

const DESIGN = JSON.stringify({
  schemaVersion: 1,
  category: 'South Asian / Desi',
  tags: ['desi'],
  featured: true,
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
    typography: { headingFont: 'serif-editorial', bodyFont: 'sans-modern' },
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

function template(overrides: Partial<WebsiteTemplateDto> = {}): WebsiteTemplateDto {
  return {
    id: TEMPLATE_ID,
    name: 'Spice Garden',
    description: 'Warm desi hospitality.',
    templateKey: 'spice-garden',
    previewImageFileId: null,
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    designConfigurationJson: DESIGN,
    ...overrides
  };
}

describe('CreateWebsite template selection', () => {
  let fixture: ComponentFixture<CreateWebsite>;
  let httpMock: HttpTestingController;
  let notification: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    notification = {
      success: vi.fn(),
      error: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [CreateWebsite],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'websites/:id', children: [] }]),
        { provide: NotificationService, useValue: notification },
        {
          provide: RestaurantService,
          useValue: {
            getRestaurants: () =>
              of({
                success: true,
                data: {
                  items: [
                    {
                      id: 'restaurant-1',
                      name: 'Bella Bistro',
                      city: 'Karachi',
                      country: 'Pakistan'
                    }
                  ],
                  page: 1,
                  pageSize: 20,
                  total: 1,
                  totalPages: 1
                },
                message: null,
                errors: null
              } as unknown as ApiResponse<never>)
          }
        }
      ]
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CreateWebsite);
  });

  afterEach(() => {
    httpMock.verify();
  });

  function flushInitialLoad(): void {
    httpMock.expectOne(`${environment.apiUrl}/v1/websites/templates`).flush({
      success: true,
      data: [template()],
      message: null,
      errors: null
    });
    fixture.detectChanges();
  }

  function el<T extends Element = HTMLElement>(selector: string): T | null {
    return fixture.nativeElement.querySelector(selector) as T | null;
  }

  function component(): {
    selectTemplateById(id: string): void;
    selectRestaurant(restaurant: { id: string }): void;
    submit(): void;
  } {
    return fixture.componentInstance as unknown as {
      selectTemplateById(id: string): void;
      selectRestaurant(restaurant: { id: string }): void;
      submit(): void;
    };
  }

  function fillValidForm(): void {
    const form = (fixture.componentInstance as unknown as {
      form: {
        controls: {
          name: { setValue(value: string): void };
          slug: { setValue(value: string): void };
        };
      };
    }).form;

    form.controls.name.setValue('Bella Bistro');
    form.controls.slug.setValue('bella-bistro');
  }

  function submitForm(): void {
    component().submit();
    fixture.detectChanges();
  }

  it('loads the tenant catalogue and exposes it to the gallery', () => {
    flushInitialLoad();

    expect(el('app-template-gallery')).toBeTruthy();
    expect(el('app-template-picker-card')).toBeTruthy();
  });

  it('keeps the database GUID of the selected template', () => {
    flushInitialLoad();

    el<HTMLButtonElement>('.picker-select')?.click();
    fixture.detectChanges();

    // Selecting a card marks it as the chosen template.
    expect(el('.picker-card-selected')).toBeTruthy();

    // The selection is carried by the DATABASE GUID, never by the template
    // key, the display name or a client-side alias.
    component().selectRestaurant({ id: 'restaurant-1' });
    fillValidForm();
    submitForm();

    const request = httpMock.expectOne(
      req => req.method === 'POST' && req.url === `${environment.apiUrl}/v1/websites`
    );

    expect(request.request.body.websiteTemplateId).toBe(TEMPLATE_ID);
    expect(request.request.body.websiteTemplateId).not.toBe('spice-garden');
  });

  it('sends the database GUID when the website is actually created', () => {
    flushInitialLoad();

    component().selectTemplateById(TEMPLATE_ID);
    component().selectRestaurant({ id: 'restaurant-1' });
    fillValidForm();
    submitForm();

    const request = httpMock.expectOne(
      req => req.method === 'POST' && req.url === `${environment.apiUrl}/v1/websites`
    );

    expect(request.request.body.websiteTemplateId).toBe(TEMPLATE_ID);
    expect(request.request.body.restaurantId).toBe('restaurant-1');
  });

  it('makes no write request when a template is previewed', () => {
    flushInitialLoad();

    el<HTMLButtonElement>('.picker-preview')?.click();
    fixture.detectChanges();

    // Previewing is a read-only operation: the only outstanding request is
    // the initial catalogue load, and no POST/PUT/DELETE is issued.
    const writeRequests = httpMock.match(
      (req: HttpRequest<unknown>) =>
        req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE'
    );

    expect(writeRequests.length).toBe(0);
    expect(el('.preview-panel')).toBeTruthy();
  });

  it('does not select the template when it is only previewed', () => {
    flushInitialLoad();

    el<HTMLButtonElement>('.picker-preview')?.click();
    fixture.detectChanges();

    // The gallery still shows no selection until the template is confirmed.
    expect(el('.picker-card-selected')).toBeNull();
  });

  it('selects the database GUID when the previewed template is applied', () => {
    flushInitialLoad();

    el<HTMLButtonElement>('.picker-preview')?.click();
    fixture.detectChanges();

    el<HTMLButtonElement>('.preview-primary')?.click();
    fixture.detectChanges();

    expect(el('.picker-card-selected')).toBeTruthy();

    // The applied template is the one that is submitted, addressed by its
    // database GUID.
    component().selectRestaurant({ id: 'restaurant-1' });
    fillValidForm();
    submitForm();

    const request = httpMock.expectOne(
      req => req.method === 'POST' && req.url === `${environment.apiUrl}/v1/websites`
    );

    expect(request.request.body.websiteTemplateId).toBe(TEMPLATE_ID);
  });

  it('closes the preview without selecting anything', () => {
    flushInitialLoad();

    el<HTMLButtonElement>('.picker-preview')?.click();
    fixture.detectChanges();

    el<HTMLButtonElement>('.preview-close')?.click();
    fixture.detectChanges();

    expect(el('.preview-panel')).toBeNull();
    expect(el('.picker-card-selected')).toBeNull();
  });

  it('orders the catalogue by the display order of the design configuration', () => {
    httpMock.expectOne(`${environment.apiUrl}/v1/websites/templates`).flush({
      success: true,
      data: [
        template({
          id: 'second',
          name: 'Zebra',
          templateKey: 'zebra',
          designConfigurationJson: JSON.stringify({
            ...JSON.parse(DESIGN),
            displayOrder: 9
          })
        }),
        template({
          id: 'first',
          name: 'Alpha',
          templateKey: 'alpha',
          designConfigurationJson: JSON.stringify({
            ...JSON.parse(DESIGN),
            displayOrder: 2
          })
        })
      ],
      message: null,
      errors: null
    });
    fixture.detectChanges();

    const names = Array.from(
      fixture.nativeElement.querySelectorAll('.picker-name') as NodeListOf<Element>
    ).map(node => node.textContent?.trim());

    expect(names).toEqual(['Alpha', 'Zebra']);
  });

  it('shows an actionable error when the catalogue cannot be loaded', () => {
    httpMock.expectOne(`${environment.apiUrl}/v1/websites/templates`).flush(
      { success: false, data: null, message: 'Unable to load templates.', errors: null },
      { status: 500, statusText: 'Server Error' }
    );
    fixture.detectChanges();

    expect(el('.gallery-error')).toBeTruthy();
  });

  it('navigates to the created website after a successful creation', async () => {
    flushInitialLoad();

    component().selectTemplateById(TEMPLATE_ID);
    component().selectRestaurant({ id: 'restaurant-1' });
    fillValidForm();
    submitForm();

    httpMock.expectOne(
      req => req.method === 'POST' && req.url === `${environment.apiUrl}/v1/websites`
    ).flush({
      success: true,
      data: { id: 'website-1', name: 'Bella Bistro' },
      message: null,
      errors: null
    });

    await fixture.whenStable();

    const router = TestBed.inject(Router);
    expect(router.url).toContain('/websites/website-1');
  });

  describe('templateId query parameter (from the template preview page)', () => {
    /** Rebuilds the fixture with a fixed ActivatedRoute snapshot. */
    async function createWithQuery(queryParams: Record<string, string>): Promise<void> {
      TestBed.resetTestingModule();

      await TestBed.configureTestingModule({
        imports: [CreateWebsite],
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          provideRouter([{ path: 'websites/:id', children: [] }]),
          { provide: NotificationService, useValue: notification },
          {
            provide: ActivatedRoute,
            useValue: { snapshot: { queryParamMap: new Map(Object.entries(queryParams)) } }
          },
          {
            provide: RestaurantService,
            useValue: {
              getRestaurants: () =>
                of({
                  success: true,
                  data: {
                    items: [{ id: 'restaurant-1', name: 'Bella Bistro' }],
                    page: 1,
                    pageSize: 20,
                    total: 1,
                    totalPages: 1
                  },
                  message: null,
                  errors: null
                } as unknown as ApiResponse<never>)
            }
          }
        ]
      }).compileComponents();

      httpMock = TestBed.inject(HttpTestingController);
      fixture = TestBed.createComponent(CreateWebsite);
    }

    it('preselects the requested template and submits its GUID', async () => {
      await createWithQuery({ templateId: TEMPLATE_ID });

      flushInitialLoad();
      fixture.detectChanges();

      // The preselected template is visible in the summary card...
      expect(el('.selected-template-card')).toBeTruthy();
      expect(el('.selected-template-name')?.textContent?.trim()).toBe('Spice Garden');

      // ...and reaches the real creation contract without further clicking.
      component().selectRestaurant({ id: 'restaurant-1' });
      fillValidForm();
      submitForm();

      const request = httpMock.expectOne(
        req => req.method === 'POST' && req.url === `${environment.apiUrl}/v1/websites`
      );

      expect(request.request.body.websiteTemplateId).toBe(TEMPLATE_ID);
    });

    it('reports an unknown templateId without selecting any template', async () => {
      await createWithQuery({ templateId: 'missing-guid' });

      flushInitialLoad();
      fixture.detectChanges();

      expect(el('.template-notice')).toBeTruthy();
      expect(el('.selected-template-card')).toBeNull();

      component().selectRestaurant({ id: 'restaurant-1' });
      fillValidForm();
      submitForm();

      // Nothing was invented to satisfy the stale link: submission is blocked
      // until the user explicitly chooses a template.
      const writeRequests = httpMock.match(
        (req: HttpRequest<unknown>) => req.method === 'POST'
      );
      expect(writeRequests.length).toBe(0);
    });

    it('refuses to preselect an inactive template', async () => {
      await createWithQuery({ templateId: TEMPLATE_ID });

      httpMock.expectOne(`${environment.apiUrl}/v1/websites/templates`).flush({
        success: true,
        data: [template({ isActive: false })],
        message: null,
        errors: null
      });
      fixture.detectChanges();

      expect(el('.template-notice')).toBeTruthy();
      expect(el('.selected-template-card')).toBeNull();
    });

    it('shows an actionable notice when the catalogue fails while a templateId is pending', async () => {
      await createWithQuery({ templateId: TEMPLATE_ID });

      httpMock.expectOne(`${environment.apiUrl}/v1/websites/templates`).flush(
        { success: false, data: null, message: 'Unavailable.', errors: null },
        { status: 503, statusText: 'Unavailable' }
      );
      fixture.detectChanges();

      // No background retry loop is started — exactly one request was made.
      expect(el('.template-notice')).toBeTruthy();
      expect(el('.selected-template-card')).toBeNull();
      httpMock.expectNone(`${environment.apiUrl}/v1/websites/templates`);

      // The user's explicit gallery retry still resolves the deep link.
      el<HTMLButtonElement>('.gallery-retry')?.click();
      httpMock.expectOne(`${environment.apiUrl}/v1/websites/templates`).flush({
        success: true,
        data: [template()],
        message: null,
        errors: null
      });
      fixture.detectChanges();

      expect(el('.selected-template-card')).toBeTruthy();
    });

    it('preserves the original behavior when no templateId is supplied', async () => {
      await createWithQuery({});

      flushInitialLoad();
      fixture.detectChanges();

      expect(el('.selected-template-card')).toBeNull();
      expect(el('.template-notice')).toBeNull();

      // Manual selection still works exactly as before.
      el<HTMLButtonElement>('.picker-select')?.click();
      fixture.detectChanges();
      expect(el('.picker-card-selected')).toBeTruthy();
    });

    it('navigates to the editor when creation was started from a template preview', async () => {
      await createWithQuery({ templateId: TEMPLATE_ID });

      flushInitialLoad();
      fixture.detectChanges();

      component().selectRestaurant({ id: 'restaurant-1' });
      fillValidForm();
      submitForm();

      httpMock.expectOne(
        req => req.method === 'POST' && req.url === `${environment.apiUrl}/v1/websites`
      ).flush({
        success: true,
        data: { id: 'website-1', name: 'Bella Bistro' },
        message: null,
        errors: null
      });

      await fixture.whenStable();

      const router = TestBed.inject(Router);
      expect(router.url).toContain('/websites/website-1/editor');
    });
  });
});
