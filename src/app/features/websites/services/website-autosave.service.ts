import { inject, Injectable } from '@angular/core';
import { debounceTime, distinctUntilChanged, Observable, Subject, takeUntil } from 'rxjs';
import { WebsiteService } from '../services/website.service';
import type { WebsiteDto } from '../models/website.model';
import type { WebsiteConfig } from '../models/website-config.model';
import { serializeWebsiteConfig } from '../utils/website-config.util';

export type AutosaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'failed';

export interface AutosaveState {
  status: AutosaveStatus;
  lastSaved: Date | null;
  error: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class WebsiteAutosaveService {
  private readonly websiteService = inject(WebsiteService);

  private readonly destroy$ = new Subject<void>();
  private readonly saveTrigger$ = new Subject<{ websiteId: string; config: WebsiteConfig }>();
  private readonly status$ = new Subject<AutosaveState>();

  private currentWebsiteId: string | null = null;
  private pendingConfig: WebsiteConfig | null = null;
  private lastSavedConfigHash: string | null = null;
  private saveInProgress = false;
  private retryCount = 0;
  private readonly maxRetries = 3;

  constructor() {
    this.setupAutosave();
  }

  private setupAutosave(): void {
    this.saveTrigger$
      .pipe(
        debounceTime(2000),
        distinctUntilChanged((prev, curr) => this.configHash(prev.config) === this.configHash(curr.config)),
        takeUntil(this.destroy$)
      )
      .subscribe(({ websiteId, config }) => {
        this.executeSave(websiteId, config);
      });
  }

  private configHash(config: WebsiteConfig): string {
    return JSON.stringify(config);
  }

  triggerSave(websiteId: string, config: WebsiteConfig): void {
    if (!this.hasChanges(config)) return;

    this.currentWebsiteId = websiteId;
    this.pendingConfig = config;
    this.saveTrigger$.next({ websiteId, config });
  }

  private hasChanges(config: WebsiteConfig): boolean {
    const hash = this.configHash(config);
    return hash !== this.lastSavedConfigHash;
  }

  private async executeSave(websiteId: string, config: WebsiteConfig): Promise<void> {
    if (this.saveInProgress) return;

    this.saveInProgress = true;
    this.emitStatus({ status: 'saving', lastSaved: null, error: null });

    try {
      const request = { configurationJson: serializeWebsiteConfig(config) };
      const response = await this.websiteService.saveDraft(websiteId, request).toPromise();

      if (response?.success && response.data) {
        this.lastSavedConfigHash = this.configHash(config);
        this.retryCount = 0;
        this.emitStatus({
          status: 'saved',
          lastSaved: new Date(),
          error: null
        });

        setTimeout(() => {
          this.emitStatus({ status: 'idle', lastSaved: new Date(), error: null });
        }, 3000);
      } else {
        throw new Error(response?.message ?? 'Save failed');
      }
    } catch (error) {
      this.handleSaveError(error);
    } finally {
      this.saveInProgress = false;
    }
  }

  private handleSaveError(error: unknown): void {
    const message = error instanceof Error ? error.message : 'Save failed. Your changes are kept locally.';

    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      this.emitStatus({ status: 'pending', lastSaved: null, error: `Retrying... (${this.retryCount}/${this.maxRetries})` });

      setTimeout(() => {
        if (this.currentWebsiteId && this.pendingConfig) {
          this.executeSave(this.currentWebsiteId, this.pendingConfig);
        }
      }, 2000 * this.retryCount);
    } else {
      this.emitStatus({ status: 'failed', lastSaved: null, error: message });
    }
  }

  private emitStatus(state: AutosaveState): void {
    this.status$.next(state);
  }

  getStatus(): Observable<AutosaveState> {
    return this.status$.asObservable();
  }

  forceSave(): void {
    if (this.currentWebsiteId && this.pendingConfig) {
      this.lastSavedConfigHash = null;
      this.saveTrigger$.next({ websiteId: this.currentWebsiteId, config: this.pendingConfig });
    }
  }

  flushPending(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.currentWebsiteId || !this.pendingConfig) {
        resolve();
        return;
      }

      const subscription = this.status$.pipe(
        takeUntil(this.destroy$)
      ).subscribe(state => {
        if (state.status === 'saved' || state.status === 'failed') {
          subscription.unsubscribe();
          if (state.status === 'saved') {
            resolve();
          } else {
            reject(new Error(state.error ?? 'Autosave failed'));
          }
        }
      });

      this.forceSave();

      setTimeout(() => {
        if (!subscription.closed) {
          subscription.unsubscribe();
          reject(new Error('Autosave timeout'));
        }
      }, 10000);
    });
  }

  reset(): void {
    this.currentWebsiteId = null;
    this.pendingConfig = null;
    this.lastSavedConfigHash = null;
    this.saveInProgress = false;
    this.retryCount = 0;
    this.emitStatus({ status: 'idle', lastSaved: null, error: null });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}