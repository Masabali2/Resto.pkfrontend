import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Router } from '@angular/router';
import { Component } from '@angular/core';
import { vi } from 'vitest';
import { Navbar } from './navbar';
import { AuthStateService } from '../../../../core/services/auth-state.service';
import type { AuthResult } from '../../../../core/models/auth.model';

function buildAuthResult(
  overrides: Partial<AuthResult> = {}
): AuthResult {
  return {
    user: {
      id: 'user-1',
      email: 'owner@resto.pk',
      userName: 'Masab',
      platformRoles: ['Owner']
    },
    memberships: [],
    activeTenant: null,
    permissions: [],
    ...overrides
  };
}

@Component({ selector: 'app-login-stub', template: '' })
class LoginStub {}

describe('Public Navbar', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Navbar>>;
  let component: Navbar;
  let router: Router;
  let authState: AuthStateService;

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function text(selector: string): string {
    return (
      (element().querySelector(selector)?.textContent ?? '').trim()
    );
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Navbar],
      providers: [
        provideRouter([{ path: 'login', component: LoginStub }])
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
    authState = TestBed.inject(AuthStateService);
    fixture = TestBed.createComponent(Navbar);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('shows Sign In and Get Started when unauthenticated', () => {
    authState.clearAuthState();
    fixture.detectChanges();

    expect(text('.navbar-auth-link')).toBe('Sign In');
    expect(element().querySelector('.profile-trigger')).toBeNull();
    expect(text('app-button')).toContain('Get Started');
  });

  it('shows profile trigger when authenticated', () => {
    authState.setAuthResult(buildAuthResult());
    fixture.detectChanges();

    expect(element().querySelector('.navbar-auth-link')).toBeNull();
    expect(element().querySelector('.profile-trigger')).toBeTruthy();
    expect(text('.profile-name')).toBe('Masab');
  });

  it('shows initials fallback in profile avatar', () => {
    authState.setAuthResult(buildAuthResult());
    fixture.detectChanges();

    expect(text('.profile-avatar')).toBe('M');
  });

  it('opens profile dropdown showing name and email', () => {
    authState.setAuthResult(buildAuthResult());
    fixture.detectChanges();

    const trigger = element().querySelector(
      '.profile-trigger'
    ) as HTMLElement;
    trigger.click();
    fixture.detectChanges();

    expect(element().querySelector('.profile-menu')).toBeTruthy();
    expect(text('.profile-menu-name')).toBe('Masab');
    expect(text('.profile-menu-email')).toBe('owner@resto.pk');
  });

  it('navigates to /dashboard from profile menu', () => {
    authState.setAuthResult(buildAuthResult());
    const navigateSpy = vi
      .spyOn(router, 'navigateByUrl')
      .mockResolvedValue(true);

    fixture.detectChanges();

    const trigger = element().querySelector(
      '.profile-trigger'
    ) as HTMLElement;
    trigger.click();
    fixture.detectChanges();

    const dashboardItem = element().querySelector(
      '.profile-menu-item:not(.profile-menu-item-danger)'
    ) as HTMLElement;
    dashboardItem.click();
    fixture.detectChanges();

    expect(navigateSpy).toHaveBeenCalledWith('/dashboard', {
      replaceUrl: false
    });
  });

  it('logs out using existing auth flow', () => {
    authState.setAuthResult(buildAuthResult());
    fixture.detectChanges();

    const trigger = element().querySelector(
      '.profile-trigger'
    ) as HTMLElement;
    trigger.click();
    fixture.detectChanges();

    const logoutItem = element().querySelector(
      '.profile-menu-item-danger'
    ) as HTMLElement;
    logoutItem.click();
    fixture.detectChanges();

    expect(component.signingOut()).toBeTruthy();
  });

  it('shows Sign In while session is not yet initialized', () => {
    fixture.detectChanges();

    expect(component.isInitialized()).toBeFalsy();
    expect(element().querySelector('.profile-trigger')).toBeNull();
    expect(text('.navbar-auth-link')).toBe('Sign In');
  });

  it('closes mobile menu when opening profile menu on mobile', () => {
    authState.setAuthResult(buildAuthResult());
    component.toggleMobileMenu();
    fixture.detectChanges();

    expect(component.mobileMenuOpen()).toBeTruthy();

    component.toggleProfileMenu();
    fixture.detectChanges();

    expect(component.mobileMenuOpen()).toBeFalsy();
  });
});
