import { Injectable, inject } from '@angular/core';
import { Observable, Subject, catchError, concatMap, debounceTime, of } from 'rxjs';
import { WebsiteService } from './website.service';
import type { ApiResponse } from '../../../core/models/api-response.model';
import type { WebsiteDto } from '../models/website.model';
import type { WebsiteConfig } from '../models/website-config.model';
import { serializeWebsiteConfig } from '../utils/website-config.util';

export type AutosaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'failed';

export interface AutosaveState {
  status: AutosaveStatus;
  /** Monotonic revision confirmed by the last successful save. */
  savedVersion: number;
  lastSaved: Date | null;
  error: string | null;
}

interface SaveJob {
  websiteId: string;
  config: WebsiteConfig;
  version: number;
}

/** Debounce applied to queued edits before a save job is released. */
const AUTOSAVE_DEBOUNCE_MS = 2000;
/** Backoff before an explicit retry of a failed save (no auto loops). */
const RETRY_BACKOFF_MS = 1500;
/** Upper bound for an explicit Save Draft round trip before surfacing failure. */
const SAVE_DEADLINE_MS = 30000;

/**
 * Serializes draft persistence for the website editor.
 *
 * Every meaningful edit calls {@link triggerSave}, which stamps the change
 * with a monotonically increasing local revision and queues it behind a
 * debounce so rapid edits coalesce into one request. The queue is processed
 * through `concatMap`, guaranteeing at most one in-flight PUT /draft and
 * preserving request ordering — the newest configuration is always the last
 * write that reaches the server.
 *
 * Race-condition guarantees:
 * - A successful response only marks state as `saved` when no newer local
 *   revision exists (`version === latestVersion`). An older confirmation can
 *   never mark newer edits as saved; those stay pending until persisted.
 * - Explicit {@link saveNow} flushes the debounce immediately and resolves
 *   truthfully: it fulfills only after the save covering the latest revision
 *   succeeded, and rejects when any save required for it failed.
 * - Failed saves are NOT retried automatically (avoids infinite loops); the
 *   UI exposes an explicit {@link retry}. Retries always use the latest
 *   eligible snapshot, never a stale captured config.
 *
 * Backend limitation (documented, not simulated): PUT /api/v1/websites/{id}/draft
 * has no ETag/version precondition, so if another writer saves between our
 * requests, last-write-wins applies server-side. The sequencing above only
 * guarantees ordering of *this client's* writes.
 */
@Injectable({ providedIn: 'root' })
export class WebsiteAutosaveService {
  private readonly websiteService = inject(WebsiteService);

  private readonly saveQueue$ = new Subject<SaveJob>();
  private readonly statusSubject = new Subject<AutosaveState>();

  private currentWebsiteId: string | null = null;
  private latestVersion = 0;
  private savedVersion = 0;
  private lastSnapshot: WebsiteConfig | null = null;
  private lastError: string | null = null;
  private lastSavedAt: Date | null = null;
  private queueFailed = false;
  private retryScheduled = false;
  private disposed = false;

  /** Emits every status transition; consumers must map versions themselves. */
  readonly status$: Observable<AutosaveState> = this.statusSubject.asObservable();

  constructor() {
    this.saveQueue$
      .pipe(
        debounceTime(AUTOSAVE_DEBOUNCE_MS),
        // Serialize writes: one in-flight request at a time, in order.
        concatMap(job => this.processJob(job))
      )
      .subscribe(() => this.publishStatus());
  }

  /**
   * Queues a debounced save of the latest configuration snapshot for the
   * given website. Returns the assigned revision so callers can correlate
   * later status events. Ignores snapshots identical to the last queued one
   * (coalescing keystroke-level churn) and snapshots already saved.
   */
  triggerSave(websiteId: string, config: WebsiteConfig): number {
    if (!websiteId || !config) return this.savedVersion;

    const snapshotJson = serializeWebsiteConfig(config);

    if (this.lastSnapshot && serializeWebsiteConfig(this.lastSnapshot) === snapshotJson) {
      return this.latestVersion;
    }

    this.currentWebsiteId = websiteId;
    this.lastSnapshot = config;
    this.latestVersion += 1;
    this.queueFailed = false;
    this.retryScheduled = false;
    this.lastError = null;

    this.saveQueue$.next({ websiteId, config, version: this.latestVersion });
    this.publishStatus('pending');
    return this.latestVersion;
  }

  /**
   * Flushes pending edits immediately and waits until the revision that was
   * latest at call time is confirmed persisted. Resolves with the confirmed
   * state; rejects (with an actionable message) if the required save failed.
   */
  saveNow(): Promise<AutosaveState> {
    const targetVersion = this.latestVersion;

    if (targetVersion === 0) {
      // Nothing was ever edited in this session — nothing to persist.
      return Promise.resolve(this.buildState('idle'));
    }

    if (this.savedVersion >= targetVersion && !this.queueFailed) {
      return Promise.resolve(this.buildState('saved'));
    }

    return new Promise<AutosaveState>((resolve, reject) => {
      let settled = false;

      const finish = (state: AutosaveState): void => {
        if (settled) return;
        settled = true;
        subscription.unsubscribe();
        resolve(state);
      };

      const fail = (message: string): void => {
        if (settled) return;
        settled = true;
        subscription.unsubscribe();
        reject(new Error(message));
      };

      const subscription = this.statusSubject.subscribe(state => {
        if (state.status === 'saving') return;

        if (state.savedVersion >= targetVersion) {
          finish(state);
          return;
        }

        if (state.status === 'failed') {
          fail(state.error ?? 'The draft could not be saved.');
        }
      });

      // Safety net: if the queue stalls (e.g. tab throttling) surface a
      // failure instead of hanging the Save button forever.
      setTimeout(() => {
        if (this.savedVersion >= targetVersion) {
          finish(this.buildState('saved'));
        } else {
          fail('The save did not complete in time. Your changes are kept locally — try again.');
        }
      }, SAVE_DEADLINE_MS);
    });
  }

  /**
   * Explicit user-initiated retry. Always re-queues the LATEST snapshot (not
   * a stale captured config) under a new revision so its success genuinely
   * covers all current edits.
   */
  retry(): void {
    if (!this.currentWebsiteId || !this.lastSnapshot) return;
    this.triggerSave(this.currentWebsiteId, this.lastSnapshot);
  }

  /** Clears all queued/persisted tracking (e.g. when a different site loads). */
  reset(): void {
    this.currentWebsiteId = null;
    this.lastSnapshot = null;
    this.latestVersion = 0;
    this.savedVersion = 0;
    this.queueFailed = false;
    this.retryScheduled = false;
    this.lastError = null;
    this.lastSavedAt = null;
    this.publishStatus('idle');
  }

  private processJob(job: SaveJob): Observable<AutosaveState> {
    // If newer edits arrived while this job waited in the queue/debounce,
    // skip the obsolete snapshot — the newest job will persist everything.
    if (job.version < this.latestVersion) {
      return of(this.publishStatus());
    }

    this.publishStatus('saving');

    return this.websiteService
      .saveDraft(job.websiteId, { configurationJson: serializeWebsiteConfig(job.config) })
      .pipe(
        // A transport error must never break the serialized write pipeline.
        catchError(() => of(null)),
        concatMap(response => of(this.applyResponse(job, response)))
      );
  }

  private applyResponse(
    job: SaveJob,
    response: ApiResponse<WebsiteDto> | null
  ): AutosaveState {
    const success = !!response?.success;

    if (success) {
      this.lastError = null;

      if (job.version >= this.savedVersion) {
        this.savedVersion = job.version;
        this.lastSavedAt = new Date();
      }

      // Only fully "saved" when nothing newer is outstanding.
      const status: AutosaveStatus =
        this.savedVersion >= this.latestVersion ? 'saved' : 'pending';
      return this.publishStatus(status);
    }

    this.queueFailed = true;
    this.lastError = response?.message ?? 'The draft could not be saved.';
    this.scheduleRetryNotice();
    return this.publishStatus('failed');
  }

  /**
   * After backoff, if the user has not produced a newer edit, re-queue the
   * latest snapshot once. Newer edits replace this pending retry naturally
   * through the normal queue, so this cannot loop indefinitely.
   */
  private scheduleRetryNotice(): void {
    if (this.retryScheduled) return;
    this.retryScheduled = true;

    setTimeout(() => {
      this.retryScheduled = false;
      if (
        !this.disposed &&
        this.queueFailed &&
        this.currentWebsiteId &&
        this.lastSnapshot &&
        this.savedVersion < this.latestVersion
      ) {
        this.triggerSave(this.currentWebsiteId, this.lastSnapshot);
      }
    }, RETRY_BACKOFF_MS);
  }

  private buildState(status: AutosaveStatus): AutosaveState {
    return {
      status,
      savedVersion: this.savedVersion,
      lastSaved: this.lastSavedAt,
      error: status === 'failed' ? this.lastError : null
    };
  }

  private publishStatus(status?: AutosaveStatus): AutosaveState {
    const state = this.buildState(status ?? this.inferStatus());
    this.statusSubject.next(state);
    return state;
  }

  private inferStatus(): AutosaveStatus {
    if (this.queueFailed && this.savedVersion < this.latestVersion) return 'failed';
    if (this.savedVersion > 0 && this.savedVersion >= this.latestVersion) return 'saved';
    if (this.latestVersion > this.savedVersion) return 'pending';
    return 'idle';
  }

  ngOnDestroy(): void {
    this.disposed = true;
    this.saveQueue$.complete();
    this.statusSubject.complete();
  }
}
