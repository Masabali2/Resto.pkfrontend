import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { SubscriptionFlowService } from './subscription-flow.service';
import { TenantContextService } from '../../../core/services/tenant-context.service';
import { AuthStateService } from '../../../core/services/auth-state.service';
import type { AuthResult } from '../../../core/models/auth.model';

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

describe('SubscriptionFlowService', () => {
  let flow: SubscriptionFlowService;
  let authState: AuthStateService;
  let router: Router;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    });

    flow = TestBed.inject(SubscriptionFlowService);
    authState = TestBed.inject(AuthStateService);
    router = TestBed.inject(Router);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  /**
   * Selects a workspace and lets the subscription service read its state.
   * The pending request is flushed so the test leaves no open HTTP call.
   */
  function selectWorkspace(tenantId: string | null): void {
    authState.setAuthResult(authResult(tenantId));
    TestBed.tick();

    const request = httpMock.match(
      req => req.url.endsWith('/subscriptions/me')
    );

    for (const item of request) {
      item.flush({
        success: true,
        data: null,
        errorCode: null,
        message: null,
        errors: null,
        traceId: null
      });
    }
  }

  it('opens the shared dialog for the active workspace', () => {
    selectWorkspace('tenant-1');

    const opened = flow.open('Adding a restaurant needs a subscription.');

    expect(opened).toBe(true);
    expect(flow.dialogOpen()).toBe(true);
    expect(flow.reason()).toBe('Adding a restaurant needs a subscription.');
  });

  it('sends the user to the workspace setup when no workspace is active', () => {
    selectWorkspace(null);

    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const opened = flow.open('Anything');

    expect(opened).toBe(false);
    expect(flow.dialogOpen()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/setup/workspace']);
  });

  it('opens the plan-selection page from the shared experience', () => {
    selectWorkspace('tenant-1');

    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    flow.open('Reason');
    flow.viewPlans();

    expect(flow.dialogOpen()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/subscription']);
  });

  it('refuses a second trial request while one is running', () => {
    selectWorkspace('tenant-1');

    flow.trialLoading.set(true);

    flow.startTrial();

    // No request is issued while the previous one is still running.
    httpMock.expectNone(req => req.url.endsWith('/subscriptions/me/trial'));
  });

  it('reports whether the workspace may use protected features', () => {
    expect(flow.canUseProtectedFeatures(null)).toBe(false);

    expect(
      flow.canUseProtectedFeatures({
        tenantId: 'tenant-1',
        tenantName: 'Resto One',
        tenantStatus: 'Active',
        hasSubscription: false,
        subscription: null,
        trial: {
          eligible: false,
          trialUsed: true,
          trialDurationDays: 30,
          reason: null
        },
        availablePlans: [],
        serverTimeUtc: '2026-01-02T00:00:00Z'
      })
    ).toBe(false);

    expect(
      flow.canUseProtectedFeatures({
        tenantId: 'tenant-1',
        tenantName: 'Resto One',
        tenantStatus: 'Active',
        hasSubscription: true,
        subscription: {
          id: 'subscription-1',
          planId: 'plan-1',
          planName: 'Free Trial',
          status: 'Trial',
          startDate: '2026-01-01T00:00:00Z',
          endDate: '2026-01-31T00:00:00Z',
          autoRenew: false,
          isEntitled: true,
          maxStaff: 5,
          maxMenuItems: 100,
          maxOrdersPerMonth: 500
        },
        trial: {
          eligible: false,
          trialUsed: true,
          trialDurationDays: 30,
          reason: null
        },
        availablePlans: [],
        serverTimeUtc: '2026-01-02T00:00:00Z'
      })
    ).toBe(true);
  });
});
