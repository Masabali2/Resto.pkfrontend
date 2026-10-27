import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Component, signal } from '@angular/core';
import { Navbar } from './navbar';
import { AuthStateService } from '../../../services/auth-state.service';
import { ActiveRestaurantStateService } from '../../../services/active-restaurant-state.service';
import { AuthorizationService } from '../../../services/authorization.service';
import { environment } from '../../../../../environments/environment';
import type { ActiveRestaurantState } from '../../../models/active-restaurant.model';
import type { AuthResult } from '../../../models/auth.model';
import type { RestaurantDto } from '../../../models/restaurant.model';

function buildRestaurant(
  overrides: Partial<RestaurantDto> = {}
): RestaurantDto {
  return {
    id: 'restaurant-a',
    tenantId: 'tenant-1',
    name: 'Brewed & Co.',
    description: null,
    phone: null,
    email: null,
    addressLine1: 'Main Road',
    addressLine2: null,
    city: 'Lahore',
    country: 'Pakistan',
    timeZone: 'Asia/Karachi',
    status: 'Active',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: null,
    ...overrides
  };
}

function buildAuthResult(permissions: string[] = []): AuthResult {
  return {
    user: {
      id: 'user-1',
      email: 'owner@resto.pk',
      userName: 'owner',
      platformRoles: ['PlatformAdmin']
    },
    memberships: [],
    activeTenant: {
      tenantId: 'tenant-1',
      name: 'Resto One',
      slug: 'resto-one',
      roleName: 'Owner'
    },
    permissions
  };
}

@Component({ selector: 'app-login-stub', template: '' })
class LoginStub {}

class ActiveRestaurantStateStub {
  readonly restaurant = signal<RestaurantDto | null>(null);
  readonly restaurants = signal<RestaurantDto[]>([]);
  readonly state = signal<ActiveRestaurantState>('idle');
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly selected: string[] = [];
  readonly refreshed: number[] = [];

  selectRestaurant(restaurantId: string): void {
    this.selected.push(restaurantId);
  }

  refresh(): void {
    this.refreshed.push(1);
  }
}

describe('Navbar', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Navbar>>;
  let component: Navbar;
  let state: ActiveRestaurantStateStub;
  let authState: AuthStateService;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    state = new ActiveRestaurantStateStub();

    await TestBed.configureTestingModule({
      imports: [Navbar],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'login', component: LoginStub }]),
        {
          provide: ActiveRestaurantStateService,
          useValue: state
        }
      ]
    }).compileComponents();

    authState = TestBed.inject(AuthStateService);
    httpMock = TestBed.inject(HttpTestingController);

    fixture = TestBed.createComponent(Navbar);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    try {
      httpMock.verify();
    } finally {
      TestBed.resetTestingModule();
    }
  });

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function text(selector: string): string {
    return (element().querySelector(selector)?.textContent ?? '').trim();
  }

  it('shows the real restaurant of the active tenant', () => {
    authState.setAuthResult(buildAuthResult());

    state.state.set('resolved');
    state.restaurant.set(
      buildRestaurant({ name: 'Karachi Darbar', city: 'Lahore' })
    );

    fixture.detectChanges();

    expect(text('.restaurant-name')).toBe('Karachi Darbar');
    expect(text('.restaurant-subtitle')).toBe('Lahore, Pakistan');
    expect(text('.restaurant-status')).toBe('Active');
    expect(text('.restaurant-logo')).toBe('KD');
  });

  it('never shows a restaurant while there is no active tenant', () => {
    authState.clearAuthState();

    state.state.set('resolved');
    state.restaurant.set(buildRestaurant());

    fixture.detectChanges();

    expect(element().querySelector('.restaurant-card')).toBeNull();
  });

  it('shows a loading state instead of a restaurant', () => {
    authState.setAuthResult(buildAuthResult());

    state.state.set('loading');
    state.loading.set(true);

    fixture.detectChanges();

    expect(element().querySelector('.restaurant-card.is-skeleton')).toBeTruthy();
    expect(element().querySelector('.restaurant-name')).toBeNull();
  });

  it('shows an empty state for a tenant without restaurants', () => {
    authState.setAuthResult(buildAuthResult(['Restaurant.Create']));

    state.state.set('empty');

    fixture.detectChanges();

    expect(text('.restaurant-placeholder-title')).toBe('No restaurant yet');
    expect(
      element().querySelector('.restaurant-placeholder-action')?.textContent?.trim()
    ).toBe('Set up');
  });

  it('offers the restaurant setup only when the user may create one', () => {
    authState.setAuthResult(buildAuthResult());

    state.state.set('empty');

    fixture.detectChanges();

    expect(element().querySelector('.restaurant-placeholder-action')).toBeNull();
  });

  it('shows an error state with a retry action', () => {
    authState.setAuthResult(buildAuthResult());

    state.state.set('error');
    state.errorMessage.set('We could not load your restaurants.');

    fixture.detectChanges();

    expect(text('.restaurant-placeholder-title')).toBe('Restaurant unavailable');

    const retry = element().querySelector<HTMLButtonElement>(
      '.restaurant-retry'
    );

    expect(retry).toBeTruthy();

    retry?.click();
    fixture.detectChanges();

    expect(state.refreshed.length).toBe(1);
  });

  it('shows a permission state without inventing a restaurant', () => {
    authState.setAuthResult(buildAuthResult());

    state.state.set('forbidden');

    fixture.detectChanges();

    expect(text('.restaurant-placeholder-title')).toBe(
      'Restaurant access unavailable'
    );
    expect(element().querySelector('.restaurant-name')).toBeNull();
  });

  it('hides the restaurant switcher for a tenant with a single restaurant', () => {
    authState.setAuthResult(buildAuthResult());

    state.state.set('resolved');
    state.restaurant.set(buildRestaurant());
    state.restaurants.set([buildRestaurant()]);

    fixture.detectChanges();

    expect(element().querySelector('app-restaurant-selector')).toBeNull();
  });

  it('lets the user switch between the restaurants of the tenant', () => {
    authState.setAuthResult(buildAuthResult());

    const first = buildRestaurant({ id: 'restaurant-a', name: 'Brewed & Co.' });
    const second = buildRestaurant({
      id: 'restaurant-b',
      name: 'Karachi Darbar',
      status: 'TemporarilyClosed'
    });

    state.state.set('resolved');
    state.restaurant.set(first);
    state.restaurants.set([first, second]);

    fixture.detectChanges();

    const trigger = element().querySelector<HTMLButtonElement>(
      '.selector-trigger'
    );

    expect(trigger).toBeTruthy();

    trigger?.click();
    fixture.detectChanges();

    const options = element().querySelectorAll('.selector-option');

    expect(options.length).toBe(2);
    expect(options[1].textContent?.trim()).toContain('Karachi Darbar');
    expect(options[1].textContent?.trim()).toContain('Temporarily closed');

    (options[1] as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(state.selected).toEqual(['restaurant-b']);
  });

  it('does not label an unknown restaurant status as active', () => {
    authState.setAuthResult(buildAuthResult());

    state.state.set('resolved');
    state.restaurant.set(buildRestaurant({ status: 'SeasonalOpening' }));

    fixture.detectChanges();

    const status = element().querySelector('.restaurant-status');

    expect(status?.textContent?.trim()).toBe('SeasonalOpening');
    expect(status?.getAttribute('data-tone')).toBe('unknown');
  });

  it('shows the workspace of the active tenant next to the restaurant', () => {
    authState.setAuthResult(buildAuthResult());

    state.state.set('resolved');
    state.restaurant.set(buildRestaurant());

    fixture.detectChanges();

    expect(text('.workspace-name')).toBe('Resto One');
  });

  it('keeps the account menu, the search and the logout working', () => {
    authState.setAuthResult(buildAuthResult());

    const searches: string[] = [];

    component.globalSearch.subscribe(value => searches.push(value));

    fixture.detectChanges();

    element().querySelector<HTMLButtonElement>('.account-trigger')?.click();
    fixture.detectChanges();

    expect(element().querySelector('.account-menu')).toBeTruthy();

    const input = element().querySelector<HTMLInputElement>(
      '.global-search input'
    );

    input!.value = 'nargoni';
    input!.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    element().querySelector<HTMLFormElement>('.global-search')?.dispatchEvent(
      new Event('submit')
    );

    expect(searches).toEqual(['nargoni']);

    element()
      .querySelector<HTMLButtonElement>('.sign-out-item')
      ?.click();

    const logout = httpMock.expectOne(
      `${environment.apiUrl}/Auth/logout`
    );

    logout.flush(null);

    expect(authState.authResult()).toBeNull();
  });

  it('asks for the restaurant setup permission through the authorization service', () => {
    authState.setAuthResult(buildAuthResult(['Restaurant.Create']));

    const authorization = TestBed.inject(AuthorizationService);

    expect(authorization.hasPermission('Restaurant.Create')).toBe(true);
  });
});
