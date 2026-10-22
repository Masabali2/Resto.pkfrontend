import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';
import { SubscriptionService } from './subscription.service';
import { AuthStateService } from '../../../core/services/auth-state.service';
import type { ApiResponse } from '../../../core/models/api-response.model';
import type { AuthResult } from '../../../core/models/auth.model';
import type { SubscriptionState } from '../models/subscription-status.model';

const API_ROOT = 'https://localhost:7182/api';

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

function authResult(tenantId: string | null): AuthResult {
  return {
    user: {
      id: 'user-1',
      email: 'owner@resto.pk',
      userName: 'owner',
      platformRoles: []
    },
    memberships: tenantId
      ? [
          {
            tenantId,
            name: 'Resto One',
            slug: 'resto-one',
            roleName: 'Owner'
          }
        ]
      : [],
    activeTenant: tenantId
      ? {
          tenantId,
          name: 'Resto One',
          slug: 'resto-one',
          roleName: 'Owner'
        }
      : null,
    permissions: []
  };
}

function state(tenantId: string, tenantStatus: string): SubscriptionState {
  return {
    tenantId,
    tenantName: 'Resto One',
    tenantStatus,
    hasSubscription: false,
    subscription: null,
    trial: {
      eligible: tenantStatus === 'Pending',
      trialUsed: false,
      trialDurationDays: 30,
      reason: null
    },
    availablePlans: [],
    serverTimeUtc: '2026-01-02T00:00:00Z'
  };
}

/**
 * The service reads the state when the active workspace changes. The change
 * is driven by a signal effect, so the test has to run a change detection
 * tick before the request exists.
 */
function settle(): void {
  TestBed.tick();
}

describe('SubscriptionService', () => {
  let service: SubscriptionService;
  let authState: AuthStateService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });

    service = TestBed.inject(SubscriptionService);
    authState = TestBed.inject(AuthStateService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('reads the state of the active workspace', () => {
    authState.setAuthResult(authResult('tenant-1'));
    settle();

    httpMock
      .expectOne(req => req.url === `${API_ROOT}/subscriptions/me`)
      .flush(apiResponse(state('tenant-1', 'Pending')));

    settle();

    expect(service.state()?.tenantId).toBe('tenant-1');
    expect(service.loading()).toBe(false);
  });

  it('clears the state when another workspace becomes active', () => {
    authState.setAuthResult(authResult('tenant-1'));
    settle();

    httpMock
      .expectOne(req => req.url === `${API_ROOT}/subscriptions/me`)
      .flush(apiResponse(state('tenant-1', 'Pending')));

    settle();

    expect(service.state()).not.toBeNull();

    authState.setAuthResult(authResult('tenant-2'));
    settle();

    // The previous workspace data is dropped immediately so it can never be
    // shown for the workspace that is active now.
    expect(service.state()).toBeNull();

    httpMock
      .expectOne(req => req.url === `${API_ROOT}/subscriptions/me`)
      .flush(apiResponse(state('tenant-2', 'Active')));

    settle();

    expect(service.state()?.tenantId).toBe('tenant-2');
  });

  it('starts the trial and refreshes the state afterwards', () => {
    authState.setAuthResult(authResult('tenant-1'));
    settle();

    httpMock
      .expectOne(req => req.url === `${API_ROOT}/subscriptions/me`)
      .flush(apiResponse(state('tenant-1', 'Pending')));

    settle();

    let completed = false;

    service.startTrial().subscribe(() => {
      completed = true;
    });

    httpMock
      .expectOne(req => req.url === `${API_ROOT}/subscriptions/me/trial`)
      .flush(
        apiResponse({
          id: 'subscription-1',
          tenantId: 'tenant-1',
          planId: 'plan-1',
          planName: 'Free Trial',
          status: 'Trial',
          startDate: '2026-01-02T00:00:00Z',
          endDate: '2026-02-01T00:00:00Z',
          autoRenew: false,
          isEntitled: true,
          createdAt: '2026-01-02T00:00:00Z',
          updatedAt: null
        })
      );

    // The tenant context is refreshed first: the workspace became active.
    httpMock
      .expectOne(req => req.url === `${API_ROOT}/Auth/me`)
      .flush(apiResponse(authResult('tenant-1')));

    httpMock
      .expectOne(req => req.url === `${API_ROOT}/subscriptions/me`)
      .flush(apiResponse(state('tenant-1', 'Active')));

    settle();

    expect(completed).toBe(true);
    expect(service.state()?.tenantStatus).toBe('Active');
  });

  it('recognises a rejected request caused by a missing subscription', () => {
    const error = {
      status: 422,
      error: { errorCode: 'SUBSCRIPTION_NOT_ENTITLED' }
    };

    expect(service.isSubscriptionRequiredError(error)).toBe(true);
    expect(service.isSubscriptionRequiredError({ status: 500 })).toBe(false);
  });
});
