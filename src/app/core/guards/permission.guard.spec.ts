import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import {
  ActivatedRouteSnapshot,
  Router,
  UrlTree
} from '@angular/router';
import { permissionGuard } from './permission.guard';
import { AuthStateService } from '../services/auth-state.service';
import type { AuthResult } from '../models/auth.model';

function buildAuthResult(permissions: string[]): AuthResult {
  return {
    user: {
      id: 'user-1',
      email: 'manager@resto.pk',
      userName: 'manager',
      platformRoles: []
    },
    memberships: [
      {
        tenantId: 'tenant-1',
        name: 'Resto One',
        slug: 'resto-one',
        roleName: 'Manager'
      }
    ],
    activeTenant: {
      tenantId: 'tenant-1',
      name: 'Resto One',
      slug: 'resto-one',
      roleName: 'Manager'
    },
    permissions
  };
}

function buildRoute(data: Record<string, unknown>): ActivatedRouteSnapshot {
  return { data } as unknown as ActivatedRouteSnapshot;
}

function runGuard(
  data: Record<string, unknown>
): boolean | UrlTree {
  const route = buildRoute(data);

  return TestBed.runInInjectionContext(
    () => permissionGuard(route, {} as never)
  ) as boolean | UrlTree;
}

function urlOf(result: boolean | UrlTree): string | null {
  return result instanceof UrlTree
    ? result.toString()
    : null;
}

describe('permissionGuard', () => {
  let authState: AuthStateService;
  let router: Router;
  let navigateSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    authState = TestBed.inject(AuthStateService);
    router = TestBed.inject(Router);
    navigateSpy = vi.spyOn(router, 'navigate');
  });

  it('redirects unauthenticated users to login without imperative navigation', () => {
    authState.clearAuthState();

    const result = runGuard({ permission: 'Menu.View' });

    expect(urlOf(result)).toBe('/login');
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('allows an authenticated user with the required permission', () => {
    authState.setAuthResult(buildAuthResult(['Menu.View']));

    expect(runGuard({ permission: 'Menu.View' })).toBe(true);
  });

  it('redirects an authenticated user lacking the permission to the dashboard', () => {
    authState.setAuthResult(buildAuthResult(['Order.View']));

    const result = runGuard({ permission: 'Menu.View' });

    expect(urlOf(result)).toBe('/dashboard');
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('requires every permission in all mode', () => {
    authState.setAuthResult(buildAuthResult(['Menu.View']));

    expect(
      urlOf(
        runGuard({
          permissions: ['Menu.View', 'Menu.Update'],
          mode: 'all'
        })
      )
    ).toBe('/dashboard');
  });

  it('accepts one matching permission in any mode', () => {
    authState.setAuthResult(buildAuthResult(['Menu.View']));

    expect(
      runGuard({
        permissions: ['Menu.View', 'Staff.Manage'],
        mode: 'any'
      })
    ).toBe(true);
  });

  it('fails closed when route metadata is missing or malformed', () => {
    authState.setAuthResult(buildAuthResult(['Menu.View']));

    expect(urlOf(runGuard({}))).toBe('/dashboard');
    expect(urlOf(runGuard({ permission: '' }))).toBe('/dashboard');
    expect(urlOf(runGuard({ permissions: [] }))).toBe('/dashboard');
  });

  it('fails closed when the session carries no permission data', () => {
    authState.setAuthResult(buildAuthResult([]));

    expect(urlOf(runGuard({ permission: 'Menu.View' }))).toBe('/dashboard');
  });
});
