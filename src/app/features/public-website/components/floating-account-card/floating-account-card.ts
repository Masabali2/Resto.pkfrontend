import { Component, computed, inject, signal } from '@angular/core';
import { Button } from '../../../../shared/components/button/button';
import { AuthStateService } from '../../../../core/services/auth-state.service';
import type { AuthResult } from '../../../../core/models/auth.model';

const DISMISSAL_KEY = 'resto_pk_account_card_dismissed';

interface AccountCardUser {
  name: string;
}

@Component({
  selector: 'app-floating-account-card',
  standalone: true,
  imports: [Button],
  templateUrl: './floating-account-card.html',
  styleUrl: './floating-account-card.css',
  host: {
    '[class.card-visible]': 'isVisible()'
  }
})
export class FloatingAccountCard {
  private readonly authState = inject(AuthStateService);

  private readonly dismissed = signal<boolean>(this.isDismissed());

  readonly isVisible = computed(
    () =>
      this.authState.isInitialized() &&
      this.authState.isAuthenticated() &&
      !this.dismissed()
  );

  readonly userName = computed<string>(() => {
    const user = this.authState.authResult()?.user;
    return user?.userName || user?.email || 'Account';
  });

  private isDismissed(): boolean {
    if (typeof sessionStorage === 'undefined') {
      return false;
    }

    try {
      return sessionStorage.getItem(DISMISSAL_KEY) === 'true';
    } catch {
      return false;
    }
  }

  private setDismissed(value: boolean): void {
    if (typeof sessionStorage === 'undefined') {
      return;
    }

    try {
      if (value) {
        sessionStorage.setItem(DISMISSAL_KEY, 'true');
      } else {
        sessionStorage.removeItem(DISMISSAL_KEY);
      }
    } catch {
      // sessionStorage may be unavailable in private browsing modes.
    }
  }

  /** Dismisses the notification and keeps the user on the public website. */
  protected dismiss(): void {
    this.dismissed.set(true);
    this.setDismissed(true);
  }

  /** Clicking Continue dismisses the notification without navigating away. */
  protected continueAs(): void {
    this.dismiss();
  }
}
