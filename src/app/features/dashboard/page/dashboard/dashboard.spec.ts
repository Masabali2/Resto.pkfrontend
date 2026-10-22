import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Dashboard } from './dashboard';
import { AuthStateService } from '../../../../core/services/auth-state.service';
import type { ApiResponse } from '../../../../core/models/api-response.model';
import type { AuthResult } from '../../../../core/models/auth.model';

const API_ROOT = 'https://localhost:7182/api';

const restaurant = {
  id: 'restaurant-1',
  tenantId: 'tenant-1',
  name: 'Brewed & Co.',
  description: null,
  phone: null,
  email: null,
  addressLine1: '1 Main Street',
  addressLine2: null,
  city: 'Lahore',
  country: 'Pakistan',
  timeZone: 'Asia/Karachi',
  status: 'Active',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: null
};

function buildAuthResult(overrides: Partial<AuthResult> = {}): AuthResult {
  return {
    user: {
      id: 'user-1',
      email: 'owner@resto.pk',
      userName: 'owner',
      platformRoles: []
    },
    memberships: [
      {
        tenantId: 'tenant-1',
        name: 'Resto One',
        slug: 'resto-one',
        roleName: 'Owner'
      }
    ],
    activeTenant: {
      tenantId: 'tenant-1',
      name: 'Resto One',
      slug: 'resto-one',
      roleName: 'Owner'
    },
    permissions: ['Menu.View', 'Website.View'],
    ...overrides
  };
}

function apiResponse<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
    errorCode: null,
    message: null,
    errors: null,
    traceId: null
  };
}

function paged<T>(items: T[], totalCount: number) {
  return {
    items,
    totalCount,
    page: 1,
    pageSize: 20,
    totalPages: 1
  };
}

describe('Dashboard', () => {
  let fixture: ComponentFixture<Dashboard>;
  let component: Dashboard;
  let authState: AuthStateService;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    }).compileComponents();

    authState = TestBed.inject(AuthStateService);
    httpMock = TestBed.inject(HttpTestingController);

    fixture = TestBed.createComponent(Dashboard);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders the onboarding experience while the account has no workspace', () => {
    authState.setAuthResult(
      buildAuthResult({ memberships: [], activeTenant: null })
    );

    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('Welcome to Resto.pk!');
    expect(element.textContent).toContain('Create your workspace');
  });

  it('asks the user to pick a workspace when none is active', () => {
    authState.setAuthResult(buildAuthResult({ activeTenant: null }));

    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('Select your workspace');
    expect(element.textContent).toContain('Resto One');
  });

  it('shows workspace data and real setup progress for the active tenant', async () => {
    authState.setAuthResult(buildAuthResult());

    fixture.detectChanges();
    await fixture.whenStable();

    httpMock
      .expectOne(req => req.url === `${API_ROOT}/restaurants`)
      .flush(apiResponse(paged([restaurant], 1)));

    httpMock
      .expectOne(req => req.url === `${API_ROOT}/v1/websites`)
      .flush(apiResponse(paged([], 0)));

    httpMock
      .expectOne(req => req.url === `${API_ROOT}/v1/restaurants/restaurant-1/menus`)
      .flush(apiResponse(paged([], 0)));

    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('Resto One');
    expect(element.textContent).toContain('1 restaurant in your workspace.');
    expect(element.textContent).toContain('Add your first restaurant');
    expect(element.textContent).toContain('Customize your website');
  });
});
