import { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { signal } from '@angular/core';
import { Observable, Subject, throwError } from 'rxjs';
import { AuthStateService } from '../../../services/auth-state.service';
import { AuthService } from '../../../services/auth.service';
import { NotificationService } from '../../../services/notification.service';
import type { AuthResult } from '../../../models/auth.model';
import { Navbar } from './navbar';

const authResult: AuthResult = {
  user: {
    id: '1',
    email: 'chef@example.com',
    userName: 'chefuser',
    platformRoles: ['RestaurantOwner']
  },
  memberships: [
    { tenantId: 't1', name: 'Spice Garden', slug: 'spice-garden', roleName: 'Owner' }
  ],
  activeTenant: {
    tenantId: 't1',
    name: 'Spice Garden',
    slug: 'spice-garden',
    roleName: 'Owner'
  },
  permissions: []
};

class FakeAuthService {
  logoutCalls = 0;
  failLogout = false;

  logout(): Observable<void> {
    this.logoutCalls += 1;
    if (this.failLogout) {
      return throwError(() => new Error('server down')) as Observable<void>;
    }
    const stream = new Subject<void>();
    stream.next();
    stream.complete();
    return stream.asObservable();
  }
}

describe('Navbar', () => {
  let fixture: ComponentFixture<Navbar>;
  let navbarElement: HTMLElement;
  let authService: FakeAuthService;
  let router: Router;
  let authState: {
    authResult: ReturnType<typeof signal<AuthResult | null>>;
    clearAuthState: () => void;
  };
  let notificationErrors: string[];

  function setup(failLogout = false): void {
    authService = new FakeAuthService();
    authService.failLogout = failLogout;
    notificationErrors = [];

    authState = {
      authResult: signal<AuthResult | null>(authResult),
      clearAuthState: () => authState.authResult.set(null)
    };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'login', loadComponent: () => Promise.resolve({ default: class {} }) }
        ]),
        { provide: AuthStateService, useValue: authState },
        { provide: AuthService, useValue: authService },
        {
          provide: NotificationService,
          useValue: { error: (message: string) => notificationErrors.push(message) }
        }
      ]
    });

    fixture = TestBed.createComponent(Navbar);
    navbarElement = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
    router = TestBed.inject(Router);
  }

  it('renders brand and workspace tenant name', () => {
    setup();
    expect(navbarElement.textContent).toContain('Resto');
    expect(
      navbarElement.querySelector('.workspace-name')?.textContent?.trim()
    ).toBe('Spice Garden');
  });

  it('hides workspace chip when there is no active tenant', () => {
    setup();
    authState.authResult.set({ ...authResult, activeTenant: null });
    fixture.detectChanges();
    expect(navbarElement.querySelector('.workspace')).toBeNull();
  });

  it('emits menuClick when the toggle button is clicked', () => {
    setup();
    let emitted = 0;
    (fixture.componentInstance as Navbar & { menuClick: { subscribe: (cb: () => void) => unknown } }).menuClick.subscribe(() => emitted += 1);
    navbarElement.querySelector<HTMLButtonElement>('.menu-toggle')!.click();
    expect(emitted).toBe(1);
  });

  it('opens account dropdown with user details', () => {
    setup();
    navbarElement.querySelector<HTMLButtonElement>('.account-trigger')!.click();
    fixture.detectChanges();
    const menu = navbarElement.querySelector('.account-menu');
    expect(menu).toBeTruthy();
    expect(menu!.textContent).toContain('chefuser');
    expect(menu!.textContent).toContain('chef@example.com');
    expect(menu!.textContent).toContain('RestaurantOwner');
  });

  it('closes account dropdown on Escape', () => {
    setup();
    const wrapper = navbarElement.querySelector('.account')!;
    navbarElement.querySelector<HTMLButtonElement>('.account-trigger')!.click();
    fixture.detectChanges();
    wrapper.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(navbarElement.querySelector('.account-menu')).toBeNull();
  });

  it('signs out, clears auth state, and navigates to /login', async () => {
    setup();
    navbarElement.querySelector<HTMLButtonElement>('.account-trigger')!.click();
    fixture.detectChanges();
    navbarElement.querySelector<HTMLButtonElement>('.menu-item.is-danger')!.click();
    await fixture.whenStable();

    expect(authService.logoutCalls).toBe(1);
    expect(router.url).toBe('/login');
    expect(authState.authResult()).toBeNull();
  });

  it('still clears state and navigates when server logout fails', async () => {
    setup(true);
    navbarElement.querySelector<HTMLButtonElement>('.account-trigger')!.click();
    fixture.detectChanges();
    navbarElement.querySelector<HTMLButtonElement>('.menu-item.is-danger')!.click();
    await fixture.whenStable();

    expect(authService.logoutCalls).toBe(1);
    expect(notificationErrors.length).toBe(1);
    expect(router.url).toBe('/login');
    expect(authState.authResult()).toBeNull();
  });

  it('prevents repeated logout submissions', () => {
    setup();
    navbarElement.querySelector<HTMLButtonElement>('.account-trigger')!.click();
    fixture.detectChanges();
    const signOutBtn = navbarElement.querySelector<HTMLButtonElement>('.menu-item.is-danger')!;
    signOutBtn.click();
    signOutBtn.click();
    signOutBtn.click();
    expect(authService.logoutCalls).toBe(1);
  });
});
