import {
  inject,
  Injectable,
  signal
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import {
  catchError,
  EMPTY,
  finalize,
  map,
  Observable,
  of,
  switchMap,
  tap,
  throwError
} from 'rxjs';
import { environment } from '../../../../environments/environment';
import { HttpErrorHandlerService } from '../../../core/services/http-error-handler.service';
import { TenantContextService } from '../../../core/services/tenant-context.service';
import type { ApiResponse } from '../../../core/models/api-response.model';
import type { SubscriptionPlan } from '../models/subscription-plan.model';
import type { SubscriptionState } from '../models/subscription-status.model';
import type { TenantSubscription } from '../models/subscription-status.model';

/** Backend error codes that mean "the workspace has no usable subscription". */
export const SUBSCRIPTION_REQUIRED_CODES = [
  'SUBSCRIPTION_REQUIRED',
  'SUBSCRIPTION_NOT_ENTITLED'
] as const;

/**
 * The single source of truth for the subscription state of the active
 * workspace.
 *
 * Responsibilities:
 *  - read the verified state from the backend (`GET /subscriptions/me`),
 *  - reload automatically whenever the active workspace changes,
 *  - clear the previous workspace state immediately on a switch so data from
 *    one workspace can never be shown for another one,
 *  - run the trial activation (POST) and refresh both the tenant context and
 *    the subscription state afterwards.
 *
 * The service never stores anything in the browser: every value it exposes
 * comes from the API, and the backend remains the authority on what the
 * workspace is allowed to do.
 */
@Injectable({ providedIn: 'root' })
export class SubscriptionService {
  private readonly http = inject(HttpClient);
  private readonly tenantContext = inject(TenantContextService);
  private readonly httpErrorHandler = inject(HttpErrorHandlerService);

  /** Latest verified state of the active workspace, `null` while unknown. */
  readonly state = signal<SubscriptionState | null>(null);

  /** True while the state is being read. */
  readonly loading = signal(false);

  /** Last error message, `null` when the last read succeeded. */
  readonly error = signal<string | null>(null);

  constructor() {
    // The active workspace is the only key of this state. `switchMap`
    // cancels an in-flight request as soon as another workspace is selected,
    // so a slow response can never overwrite the state of the workspace that
    // is active now.
    toObservable(this.tenantContext.activeTenantId)
      .pipe(
        switchMap(tenantId => {
          this.state.set(null);
          this.error.set(null);

          if (!tenantId) {
            this.loading.set(false);

            return EMPTY;
          }

          this.loading.set(true);

          return this.fetchState().pipe(
            catchError(() => {
              this.error.set(
                'We could not load your subscription details right now.'
              );

              return of(null);
            }),
            finalize(() => this.loading.set(false))
          );
        }),
        takeUntilDestroyed()
      )
      .subscribe(state => this.state.set(state));
  }

  /** Reads the verified subscription state of the active workspace. */
  loadState(): Observable<SubscriptionState> {
    return this.fetchState().pipe(
      tap(state => {
        this.state.set(state);
        this.error.set(null);
      })
    );
  }

  /** Reads the plans that are currently offered to workspaces. */
  loadPlans(): Observable<SubscriptionPlan[]> {
    return this.http
      .get<ApiResponse<SubscriptionPlan[]>>(
        `${environment.apiUrl}/subscriptions/plans`
      )
      .pipe(
        map(response =>
          response.success && response.data ? response.data : []
        )
      );
  }

  /**
   * Starts the 30-day free trial of the active workspace.
   *
   * After the backend accepted the trial the tenant context is refreshed (the
   * workspace became active) and the subscription state is re-read, so the UI
   * always reflects what the backend actually stored.
   */
  startTrial(): Observable<TenantSubscription> {
    return this.http
      .post<ApiResponse<TenantSubscription>>(
        `${environment.apiUrl}/subscriptions/me/trial`,
        null
      )
      .pipe(
        switchMap(response => {
          if (!response.success || !response.data) {
            return throwError(
              () =>
                new Error(
                  response.message ??
                    'The free trial could not be started. Please try again.'
                )
            );
          }

          return this.tenantContext.refreshSession().pipe(
            catchError(() => of(null)),
            switchMap(() => this.loadState()),
            map(() => response.data as TenantSubscription)
          );
        })
      );
  }

  /** True when the last failure was caused by a missing subscription. */
  isSubscriptionRequiredError(error: unknown): boolean {
    const status = (error as { status?: number } | null)?.status;

    if (status === 422 || status === 403) {
      const code = this.readErrorCode(error);

      if (
        code &&
        (SUBSCRIPTION_REQUIRED_CODES as readonly string[]).includes(code)
      ) {
        return true;
      }
    }

    return false;
  }

  /** Extracts a user facing message for a failed subscription request. */
  describeError(error: unknown): string {
    const details = this.httpErrorHandler.handle(error, {
      unauthorizedMessage: 'Your session has expired. Please sign in again.',
      fallbackMessage:
        'The subscription request could not be completed. Please try again.'
    });

    return (
      details.message ||
      'The subscription request could not be completed. Please try again.'
    );
  }

  private fetchState(): Observable<SubscriptionState> {
    return this.http
      .get<ApiResponse<SubscriptionState>>(
        `${environment.apiUrl}/subscriptions/me`
      )
      .pipe(
        map(response => {
          if (!response.success || !response.data) {
            throw new Error(
              response.message ?? 'The subscription state is unavailable.'
            );
          }

          return response.data;
        })
      );
  }

  private readErrorCode(error: unknown): string | null {
    const body = (error as { error?: { errorCode?: string } | null } | null)
      ?.error;

    return body?.errorCode ?? null;
  }
}
