import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { vi } from 'vitest';
import { FloatingAccountCard } from './floating-account-card';
import { AuthStateService } from '../../../../core/services/auth-state.service';
import type { AuthResult } from '../../../../core/models/auth.model';

function buildAuthResult(
  overrides: Partial<AuthResult> = {}
): AuthResult {
  return {
    user: {
      id: 'user-1',
      email: 'masab@example.com',
      userName: 'Masab Ali',
      platformRoles: ['Owner']
    },
    memberships: [],
    activeTenant: null,
    permissions: [],
    ...overrides
  };
}

@Component({ selector: 'app-dummy', template: '' })
class DummyComponent {}

describe('FloatingAccountCard', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<FloatingAccountCard>>;
  let component: FloatingAccountCard;
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
    sessionStorage.removeItem('resto_pk_account_card_dismissed');

    await TestBed.configureTestingModule({
      imports: [FloatingAccountCard]
    }).compileComponents();

    authState = TestBed.inject(AuthStateService);
    fixture = TestBed.createComponent(FloatingAccountCard);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    sessionStorage.removeItem('resto_pk_account_card_dismissed');
  });

  it('does not render when unauthenticated', () => {
    authState.clearAuthState();
    fixture.detectChanges();

    expect(element().querySelector('.floating-account-card')).toBeNull();
  });

  it('does not render while session is initializing', () => {
    fixture.detectChanges();

    expect(element().querySelector('.floating-account-card')).toBeNull();
  });

  it('renders welcome message with actual user name', () => {
    authState.setAuthResult(buildAuthResult());
    fixture.detectChanges();

    const card = element().querySelector('.floating-account-card');
    expect(card).toBeTruthy();
    expect(text('.card-message')).toContain('Continue as Masab Ali');
    expect(text('.continue-button')).toBe('Continue as Masab Ali');
  });

  it('does not display email, role, or avatar', () => {
    authState.setAuthResult(buildAuthResult());
    fixture.detectChanges();

    expect(element().querySelector('.account-email')).toBeNull();
    expect(element().querySelector('.role-value')).toBeNull();
    expect(element().querySelector('.avatar')).toBeNull();
  });

  it('does not navigate away when Continue is clicked', () => {
    authState.setAuthResult(buildAuthResult());
    fixture.detectChanges();

    const button = element().querySelector(
      '.continue-button'
    ) as HTMLElement | null;
    button?.click();
    fixture.detectChanges();

    expect(element().querySelector('.floating-account-card')).toBeNull();
  });

  it('dismisses and persists in sessionStorage', () => {
    authState.setAuthResult(buildAuthResult());
    fixture.detectChanges();

    const dismiss = element().querySelector(
      '.dismiss-button'
    ) as HTMLElement | null;
    dismiss?.click();
    fixture.detectChanges();

    expect(element().querySelector('.floating-account-card')).toBeNull();
    expect(sessionStorage.getItem('resto_pk_account_card_dismissed')).toBe(
      'true'
    );
  });

  it('does not re-render after change detection when dismissed', () => {
    authState.setAuthResult(buildAuthResult());
    fixture.detectChanges();

    const dismiss = element().querySelector(
      '.dismiss-button'
    ) as HTMLElement | null;
    dismiss?.click();
    fixture.detectChanges();

    fixture.detectChanges();

    expect(element().querySelector('.floating-account-card')).toBeNull();
  });

  it('falls back to email when userName is missing', () => {
    authState.setAuthResult(
      buildAuthResult({
        user: { id: 'user-1', email: 'masab@example.com', userName: '', platformRoles: ['Owner'] }
      })
    );
    fixture.detectChanges();

    expect(text('.continue-button')).toBe('Continue as masab@example.com');
  });

  it('falls back to Account when both userName and email are missing', () => {
    authState.setAuthResult(
      buildAuthResult({
        user: { id: 'user-1', email: '', userName: '', platformRoles: [] }
      })
    );
    fixture.detectChanges();

    expect(text('.continue-button')).toBe('Continue as Account');
  });
});
