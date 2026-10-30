import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController
} from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { MenuForm } from './menu-form';
import { environment } from '../../../../../environments/environment';
import type { ApiResponse } from '../../../../core/models/api-response.model';
import type { MenuDetailsDto, MenuDto } from '../../models/menu.model';

const API_ROOT = `${environment.apiUrl}/v1`;
const MENU_ID = 'menu-1';
const RESTAURANT_ID = 'restaurant-1';
const MENU_URL = `${API_ROOT}/menus/${MENU_ID}`;
const CREATE_URL = `${API_ROOT}/restaurants/${RESTAURANT_ID}/menus`;

function apiResponse<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
    message: null,
    errorCode: null,
    errors: null,
    traceId: null
  };
}

function failedApiResponse(message: string): ApiResponse<null> {
  return {
    success: false,
    data: null,
    message,
    errorCode: 'NotFound',
    errors: null,
    traceId: null
  };
}

function menuDetails(overrides: Partial<MenuDetailsDto> = {}): MenuDetailsDto {
  return {
    id: MENU_ID,
    tenantId: 'tenant-1',
    restaurantId: RESTAURANT_ID,
    name: 'Dinner Menu',
    description: 'Seasonal dinner favourites',
    isActive: true,
    status: 'Draft',
    createdAt: '2026-01-01',
    updatedAt: null,
    categories: [],
    ...overrides
  };
}

function menuDto(overrides: Partial<MenuDto> = {}): MenuDto {
  const { categories: _categories, ...rest } = menuDetails();

  return { ...rest, ...overrides };
}

interface Fixture {
  component: MenuForm;
  fixture: ReturnType<typeof TestBed.createComponent<MenuForm>>;
  httpMock: HttpTestingController;
  navigateCalls: any[];
}

let httpMock: HttpTestingController | null = null;

function createFixture(params: Record<string, string>): Fixture {
  const navigateCalls: any[] = [];

  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [MenuForm, HttpClientTestingModule],
    providers: [
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: {
            paramMap: convertToParamMap(params),
            queryParamMap: convertToParamMap({ restaurantId: RESTAURANT_ID })
          }
        }
      },
      {
        provide: Router,
        useValue: {
          navigate: (...args: unknown[]) => {
            navigateCalls.push(args);
            return Promise.resolve(true);
          }
        }
      }
    ]
  });

  const fixture = TestBed.createComponent(MenuForm);
  httpMock = TestBed.inject(HttpTestingController);

  return { component: fixture.componentInstance, fixture, httpMock, navigateCalls };
}

function editFixture(): Fixture {
  return createFixture({ menuId: MENU_ID });
}

function flushLoad(f: Fixture, data: MenuDetailsDto = menuDetails()): void {
  f.httpMock
    .expectOne({ method: 'GET', url: MENU_URL })
    .flush(apiResponse(data));
  f.fixture.detectChanges();
}

describe('MenuForm (edit route)', () => {
  afterEach(() => {
    httpMock?.verify();
  });

  it('renders a reactive form bound to the component form group', () => {
    const f = editFixture();
    flushLoad(f);

    const formEl = f.fixture.nativeElement.querySelector(
      'form.menu-form__form'
    ) as HTMLElement;

    expect(formEl).toBeTruthy();
    // FormGroupDirective adds these status classes only when the HTML form is
    // connected to the reactive form instance via [formGroup].
    expect(formEl.classList.contains('ng-pristine')).toBe(true);
    expect(formEl.classList.contains('ng-untouched')).toBe(true);
    expect(f.component.form.contains('name')).toBe(true);
    expect(f.component.form.contains('description')).toBe(true);
    expect(f.component.isEdit).toBe(true);
    expect(f.component.pageTitle()).toBe('Edit Menu');
  });

  it('loads the menu with GET /v1/menus/{menuId} and populates name and description', () => {
    const f = editFixture();

    const req = f.httpMock.expectOne({ method: 'GET', url: MENU_URL });
    expect(req.request.method).toBe('GET');

    req.flush(apiResponse(menuDetails()));
    f.fixture.detectChanges();

    expect(f.component.form.value.name).toBe('Dinner Menu');
    expect(f.component.form.value.description).toBe('Seasonal dinner favourites');

    const nameInput = f.fixture.nativeElement.querySelector('#name') as HTMLInputElement;
    const descriptionInput = f.fixture.nativeElement.querySelector(
      '#description'
    ) as HTMLTextAreaElement;
    expect(nameInput.value).toBe('Dinner Menu');
    expect(descriptionInput.value).toBe('Seasonal dinner favourites');

    // Populating via patchValue must not mark the form dirty, otherwise the
    // unsavedChangesGuard would block Cancel/navigation right after loading.
    expect(f.component.form.dirty).toBe(false);
  });

  it('hides the loading spinner and shows the form once the request completes', () => {
    const f = editFixture();

    expect(f.fixture.nativeElement.querySelector('app-loading-spinner')).toBeTruthy();
    expect(f.fixture.nativeElement.querySelector('form.menu-form__form')).toBeNull();

    flushLoad(f);

    expect(f.component.loading()).toBe(false);
    expect(f.fixture.nativeElement.querySelector('app-loading-spinner')).toBeNull();
    expect(f.fixture.nativeElement.querySelector('form.menu-form__form')).toBeTruthy();
  });

  it('shows an error and keeps the form visible when the GET fails (HTTP error)', () => {
    const f = editFixture();

    f.httpMock
      .expectOne({ method: 'GET', url: MENU_URL })
      .flush({ message: 'Menu not found.' }, { status: 404, statusText: 'Not Found' });
    f.fixture.detectChanges();

    expect(f.component.loading()).toBe(false);
    expect(f.component.generalError()).toBe('Menu not found.');

    const alert = f.fixture.nativeElement.querySelector('.menu-form__general-error');
    expect(alert).toBeTruthy();
    expect(f.fixture.nativeElement.querySelector('form.menu-form__form')).toBeTruthy();
    expect(f.fixture.nativeElement.querySelector('app-loading-spinner')).toBeNull();
  });

  it('stops loading and shows an error when the API responds unsuccessfully', () => {
    const f = editFixture();

    f.httpMock
      .expectOne({ method: 'GET', url: MENU_URL })
      .flush(failedApiResponse('Menu not found.'));
    f.fixture.detectChanges();

    expect(f.component.loading()).toBe(false);
    expect(f.component.generalError()).toBe('Menu not found.');
    expect(f.fixture.nativeElement.querySelector('form.menu-form__form')).toBeTruthy();
  });

  it('requires the name field and does not issue an update for invalid forms', () => {
    const f = editFixture();
    flushLoad(f);

    f.component.form.controls.name.setValue('');
    expect(f.component.form.controls.name.hasError('required')).toBe(true);
    expect(f.component.form.invalid).toBe(true);

    f.component.submit();

    expect(f.component.generalError()).toContain('required fields');
    f.httpMock.expectNone({ method: 'PUT', url: MENU_URL });
  });

  it('enforces maximum lengths on name and description', () => {
    const f = editFixture();
    flushLoad(f);

    f.component.form.controls.name.setValue('n'.repeat(151));
    expect(f.component.form.controls.name.hasError('maxlength')).toBe(true);
    f.component.form.controls.name.setValue('n'.repeat(150));
    expect(f.component.form.controls.name.valid).toBe(true);

    f.component.form.controls.description.setValue('d'.repeat(1001));
    expect(f.component.form.controls.description.hasError('maxlength')).toBe(true);
    f.component.form.controls.description.setValue('d'.repeat(1000));
    expect(f.component.form.controls.description.valid).toBe(true);
  });

  it('submits the form element with PUT /v1/menus/{menuId} and the correct payload', () => {
    const f = editFixture();
    flushLoad(f);

    f.component.form.controls.name.setValue('Updated Menu');
    f.component.form.controls.description.setValue('   ');

    const formEl = f.fixture.nativeElement.querySelector('form.menu-form__form');
    formEl.dispatchEvent(new Event('submit'));

    const req = f.httpMock.expectOne({ method: 'PUT', url: MENU_URL });
    expect(req.request.body).toEqual({
      name: 'Updated Menu',
      description: null
    });

    req.flush(apiResponse(menuDto({ name: 'Updated Menu', description: null })));

    expect(f.component.submitting()).toBe(false);
    expect(f.component.form.pristine).toBe(true);
    expect(f.navigateCalls).toEqual([
      [
        ['/menus', MENU_ID],
        {
          queryParams: { restaurantId: RESTAURANT_ID },
          queryParamsHandling: 'merge'
        }
      ]
    ]);
  });

  it('marks the form pristine and navigates to the saved menu after a successful update', () => {
    const f = editFixture();
    flushLoad(f);

    f.component.form.controls.name.setValue('Renamed');
    expect(f.component.form.dirty).toBe(true);

    f.component.submit();

    const req = f.httpMock.expectOne({ method: 'PUT', url: MENU_URL });
    req.flush(apiResponse(menuDto({ name: 'Renamed' })));

    expect(f.component.form.pristine).toBe(true);
    expect(f.navigateCalls.length).toBe(1);
    expect(f.navigateCalls[0][0]).toEqual(['/menus', MENU_ID]);
  });

  it('surfaces backend validation errors on save without navigating', () => {
    const f = editFixture();
    flushLoad(f);

    f.component.submit();

    const req = f.httpMock.expectOne({ method: 'PUT', url: MENU_URL });
    req.flush({
      success: false,
      data: null,
      message: 'Validation failed',
      errorCode: 'ValidationError',
      errors: [
        { field: 'Name', message: 'Name already exists in this restaurant.' }
      ],
      traceId: null
    } satisfies ApiResponse<never>);

    expect(f.component.fieldErrors()['name']).toBe(
      'Name already exists in this restaurant.'
    );
    expect(f.navigateCalls.length).toBe(0);
  });

  it('cancel marks the form pristine and navigates back to the menu list', () => {
    const f = editFixture();
    flushLoad(f);

    f.component.form.controls.name.setValue('Dirty value');
    expect(f.component.form.dirty).toBe(true);

    f.component.cancel();

    expect(f.component.form.pristine).toBe(true);
    expect(f.navigateCalls).toEqual([
      [
        ['/menus'],
        {
          queryParams: { restaurantId: RESTAURANT_ID },
          queryParamsHandling: 'merge'
        }
      ]
    ]);
  });
});

describe('MenuForm (create route)', () => {
  afterEach(() => {
    httpMock?.verify();
  });

  it('renders immediately without a GET and posts to the restaurant menu collection', () => {
    const f = createFixture({});

    expect(f.component.isEdit).toBe(false);
    expect(f.component.loading()).toBe(false);
    expect(f.fixture.nativeElement.querySelector('form.menu-form__form')).toBeTruthy();

    f.component.form.controls.name.setValue('Brunch Menu');
    f.component.submit();

    const req = f.httpMock.expectOne({ method: 'POST', url: CREATE_URL });
    expect(req.request.body).toEqual({ name: 'Brunch Menu', description: null });

    req.flush(apiResponse(menuDto({ id: 'menu-2', name: 'Brunch Menu', description: null })));

    expect(f.navigateCalls).toEqual([
      [
        ['/menus', 'menu-2'],
        {
          queryParams: { restaurantId: RESTAURANT_ID },
          queryParamsHandling: 'merge'
        }
      ]
    ]);
  });
});
