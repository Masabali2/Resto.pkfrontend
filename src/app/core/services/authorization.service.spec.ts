import { TestBed } from '@angular/core/testing';
import { AuthorizationService } from './authorization.service';
import { AuthStateService } from './auth-state.service';
import type { AuthResult } from '../models/auth.model';

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
    permissions: ['Menu.View', 'Order.View'],
    ...overrides
  };
}

describe('AuthorizationService', () => {
  let service: AuthorizationService;
  let authState: AuthStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthorizationService);
    authState = TestBed.inject(AuthStateService);
  });

  it('fails closed when there is no authenticated session', () => {
    authState.clearAuthState();

    expect(service.isAuthenticated()).toBe(false);
    expect(service.permissions()).toEqual([]);
    expect(service.hasPermission('Menu.View')).toBe(false);
  });

  it('grants access only for permissions present in the backend response', () => {
    authState.setAuthResult(buildAuthResult());

    expect(service.hasPermission('Menu.View')).toBe(true);
    expect(service.hasPermission('Staff.Manage')).toBe(false);
  });

  it('never infers permissions from role names', () => {
    authState.setAuthResult(
      buildAuthResult({
        permissions: [],
        activeTenant: {
          tenantId: 'tenant-1',
          name: 'Resto One',
          slug: 'resto-one',
          roleName: 'Owner'
        }
      })
    );

    expect(service.hasPermission('Menu.View')).toBe(false);
    expect(service.hasPermission('Staff.Manage')).toBe(false);
  });

  it('supports all/any matching modes', () => {
    authState.setAuthResult(buildAuthResult());

    expect(
      service.hasAllPermissions(['Menu.View', 'Order.View'])
    ).toBe(true);
    expect(
      service.hasAllPermissions(['Menu.View', 'Staff.Manage'])
    ).toBe(false);
    expect(
      service.hasAnyPermission(['Menu.View', 'Staff.Manage'])
    ).toBe(true);
    expect(
      service.hasAnyPermission(['Staff.Manage', 'Platform.Access'])
    ).toBe(false);
  });

  it('denies empty and malformed permission requests', () => {
    authState.setAuthResult(buildAuthResult());

    expect(service.hasAllPermissions([])).toBe(false);
    expect(service.hasAnyPermission([])).toBe(false);
    expect(service.hasPermission('')).toBe(false);
    expect(
      service.hasAllPermissions(['Menu.View', ''])
    ).toBe(false);
    expect(
      service.hasAnyPermission([undefined as unknown as string])
    ).toBe(false);
  });

  it('treats missing or non-array permission data as no grants', () => {
    authState.setAuthResult(
      buildAuthResult({ permissions: undefined as unknown as string[] })
    );

    expect(service.permissions()).toEqual([]);
    expect(service.hasPermission('Menu.View')).toBe(false);
  });

  it('invalidates stale permissions when the requested tenant context does not match', () => {
    authState.setAuthResult(buildAuthResult());

    service.setTenantContext('tenant-2');

    expect(service.isAuthenticated()).toBe(false);
    expect(service.permissions()).toEqual([]);
    expect(service.hasPermission('Menu.View')).toBe(false);

    service.setTenantContext('tenant-1');

    expect(service.isAuthenticated()).toBe(true);
    expect(service.hasPermission('Menu.View')).toBe(true);
  });
});
