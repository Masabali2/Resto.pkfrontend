import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  viewChild,
  ElementRef
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { LucideX } from '@lucide/angular';
import { SubscriptionOffer } from '../subscription-offer/subscription-offer';
import type { SubscriptionState } from '../../models/subscription-status.model';

/**
 * Modal that explains why a subscription protected action is blocked and
 * offers the way forward.
 *
 * It is the single plan-selection experience of the application: the same
 * component is opened from the dashboard, from the "create restaurant" action
 * and from the expired trial state, so the wording and the actions are
 * identical everywhere.
 */
@Component({
  selector: 'app-subscription-required-dialog',
  standalone: true,
  imports: [LucideX, SubscriptionOffer],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './subscription-required-dialog.html',
  styleUrls: ['./subscription-required-dialog.css', '../subscription-tokens.css'],
  host: {
    '[attr.aria-hidden]': '!open() ? "true" : null'
  }
})
export class SubscriptionRequiredDialog {
  private readonly document = inject(DOCUMENT);

  readonly open = input(false);
  readonly state = input<SubscriptionState | null>(null);
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly title = input('Subscription required');
  readonly message = input(
    'This action needs an active workspace subscription. Start your free trial to continue.'
  );

  /** Emitted when the user asks for the free trial to be started. */
  readonly startTrial = output<void>();

  /** Emitted when the user wants to open the plan-selection page. */
  readonly viewPlans = output<void>();

  /** Emitted when the dialog is dismissed. */
  readonly closed = output<void>();

  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');

  constructor() {
    effect(() => {
      if (this.open()) {
        this.focusPanel();
      }
    });
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closed.emit();
      return;
    }

    if (event.key === 'Tab') {
      this.trapFocus(event);
    }
  }

  protected onBackdropClick(): void {
    this.closed.emit();
  }

  private focusPanel(): void {
    const panel = this.panel();

    if (panel) {
      panel.nativeElement.focus();
    }
  }

  private trapFocus(event: KeyboardEvent): void {
    const panel = this.panel()?.nativeElement;

    if (!panel) {
      return;
    }

    const focusable = panel.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusable.length === 0) {
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && this.document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && this.document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
}
