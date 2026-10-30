import { Injectable, signal } from '@angular/core';

/**
 * A plan selection made on the public pricing page.
 *
 * Persisted in sessionStorage so the choice survives the login / register /
 * onboarding redirects that follow when a visitor is not yet authenticated.
 * The backend never trusts this value: plan details and pricing are always
 * resolved server-side before any subscription mutation.
 */
export interface PlanSelection {
  readonly code: string;
  readonly interval: 'Monthly' | 'Yearly';
  /**
   * Currency of the price the visitor saw. Optional for selections saved
   * before currency selection existed; the backend still validates the plan
   * and resolves its price server-side.
   */
  readonly currency?: string;
}

const SELECTION_STORAGE_KEY = 'resto.pk.planSelection';

@Injectable({ providedIn: 'root' })
export class PlanSelectionService {
  private readonly selection = signal<PlanSelection | null>(null);

  /** The currently selected plan code and billing interval, if any. */
  readonly current = this.selection.asReadonly();

  constructor() {
    if (typeof sessionStorage === 'undefined') {
      return;
    }

    try {
      const raw = sessionStorage.getItem(SELECTION_STORAGE_KEY);

      if (raw) {
        const parsed = JSON.parse(raw) as PlanSelection | null;

        if (
          parsed &&
          typeof parsed.code === 'string' &&
          (parsed.interval === 'Monthly' || parsed.interval === 'Yearly')
        ) {
          this.selection.set(
            typeof parsed.currency === 'string'
              ? { ...parsed, currency: parsed.currency }
              : { code: parsed.code, interval: parsed.interval },
          );
        }
      }
    } catch {
      // sessionStorage is a UX convenience only; ignore storage errors.
    }
  }

  /** Persist the selected plan and billing interval. */
  select(
    code: string,
    interval: 'Monthly' | 'Yearly',
    currency?: string,
  ): void {
    const next: PlanSelection = currency
      ? { code, interval, currency }
      : { code, interval };

    this.selection.set(next);

    try {
      sessionStorage.setItem(SELECTION_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // sessionStorage is a UX convenience only; ignore storage errors.
    }
  }

  /** Clear the persisted selection. */
  clear(): void {
    this.selection.set(null);

    try {
      sessionStorage.removeItem(SELECTION_STORAGE_KEY);
    } catch {
      // sessionStorage is a UX convenience only; ignore storage errors.
    }
  }
}
