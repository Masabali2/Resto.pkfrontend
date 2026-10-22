import {
  inject,
  Injectable,
  signal
} from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { NotificationService } from '../../../core/services/notification.service';
import { TenantContextService } from '../../../core/services/tenant-context.service';
import { SubscriptionService } from './subscription.service';
import type { SubscriptionState } from '../models/subscription-status.model';

/**
 * The one subscription flow of the application.
 *
 * The dashboard, the restaurant setup and every other entry point open the
 * SAME dialog, read the SAME state and run the SAME trial activation. There
 * is no second plan-selection interface and no second source of truth:
 * <see cref="SubscriptionService"/> owns the data, this service owns the
 * interaction.
 */
@Injectable({ providedIn: 'root' })
export class SubscriptionFlowService {
  private readonly subscriptions = inject(SubscriptionService);
  private readonly tenantContext = inject(TenantContextService);
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);

  /** True while the shared subscription dialog is open. */
  readonly dialogOpen = signal(false);

  /** Why the dialog was opened, shown as the dialog headline. */
  readonly reason = signal<string | null>(null);

  /** True while the trial request is in flight. */
  readonly trialLoading = signal(false);

  /** Last error of the trial request. */
  readonly trialError = signal<string | null>(null);

  /** Verified state of the active workspace. */
  readonly state = this.subscriptions.state;

  /** True while the state is being read. */
  readonly loading = this.subscriptions.loading;

  /** Emitted after a successful trial activation. */
  readonly trialActivated = new Subject<void>();

  /**
   * Opens the shared subscription experience.
   *
   * When no workspace is active the user is sent to the existing workspace
   * setup flow instead, because there is nothing to subscribe to yet.
   *
   * @returns true when the dialog was opened.
   */
  open(reason: string | null = null): boolean {
    if (!this.tenantContext.activeTenantId()) {
      void this.router.navigate(['/setup/workspace']);

      return false;
    }

    this.reason.set(reason);
    this.trialError.set(null);
    this.dialogOpen.set(true);

    return true;
  }

  close(): void {
    this.dialogOpen.set(false);
    this.trialError.set(null);
  }

  /**
   * Opens the plan-selection page.
   *
   * The page is the same experience the dialog shows, so the user keeps one
   * consistent view of the plans wherever they arrive from.
   */
  viewPlans(): void {
    this.dialogOpen.set(false);
    this.trialError.set(null);

    void this.router.navigate(['/subscription']);
  }

  /**
   * Starts the free trial of the active workspace.
   *
   * The request cannot be submitted twice: the button is disabled while the
   * request is running and the service refuses a concurrent start.
   */
  startTrial(): void {
    if (this.trialLoading()) {
      return;
    }

    this.trialLoading.set(true);
    this.trialError.set(null);

    this.subscriptions.startTrial().subscribe({
      next: () => {
        this.trialLoading.set(false);
        this.dialogOpen.set(false);

        this.notifications.success(
          'Your workspace is active. Enjoy your free trial!'
        );

        this.trialActivated.next();
      },
      error: (error: unknown) => {
        this.trialLoading.set(false);
        this.trialError.set(this.subscriptions.describeError(error));

        this.subscriptions.loadState().subscribe({
          error: () => undefined
        });
      }
    });
  }

  /** True when the workspace may use subscription protected features. */
  canUseProtectedFeatures(state: SubscriptionState | null): boolean {
    if (!state) {
      return false;
    }

    return state.tenantStatus === 'Active' && state.subscription?.isEntitled === true;
  }

  /**
   * True when a failed request was rejected because the workspace has no
   * eligible subscription. The backend error code is the only source of this
   * decision.
   */
  isSubscriptionRequiredError(error: unknown): boolean {
    return this.subscriptions.isSubscriptionRequiredError(error);
  }
}
