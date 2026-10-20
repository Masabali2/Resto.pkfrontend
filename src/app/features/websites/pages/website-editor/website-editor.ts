import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnDestroy,
  signal
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin, Subject, takeUntil } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { WebsiteService } from '../../services/website.service';
import { HttpErrorHandlerService } from '../../../../core/services/http-error-handler.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Button } from '../../../../shared/components/button/button';
import { LoadingSpinner } from '../../../../shared/components/loading-spinner/loading-spinner';
import { EditorSettingsPanel, type ThemeChange } from '../../components/editor-settings-panel/editor-settings-panel';
import { WebsitePreview } from '../../components/website-preview/website-preview';
import {
  createDefaultWebsiteConfig,
  parseWebsiteConfig,
  serializeWebsiteConfig
} from '../../utils/website-config.util';
import type { ApiResponse } from '../../../../core/models/api-response.model';
import type { WebsiteConfig } from '../../models/website-config.model';
import type { WebsiteDto } from '../../models/website.model';
import type { WebsiteDraftDto } from '../../models/website-draft.model';

type EditorState = 'loading' | 'ready' | 'no-draft' | 'draft-invalid' | 'missing' | 'error';
type SaveState = 'clean' | 'dirty' | 'saving' | 'saved' | 'failed';
type PublishState = 'idle' | 'confirming' | 'publishing' | 'unpublishing';

const GUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function buildPublicSiteUrl(baseUrl: string, slug: string): string | null {
  if (!baseUrl || !slug) return null;
  try {
    const url = new URL(`${baseUrl.replace(/\/+$/, '')}/${encodeURIComponent(slug)}`);
    // Only http(s) links are ever surfaced to users.
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

@Component({
  selector: 'app-website-editor',
  standalone: true,
  imports: [RouterLink, Button, LoadingSpinner, EditorSettingsPanel, WebsitePreview],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './website-editor.html',
  styleUrl: './website-editor.css'
})
export class WebsiteEditor implements OnDestroy {
  /** Bound from the :id route parameter via withComponentInputBinding. */
  readonly id = input('');

  private readonly route = inject(ActivatedRoute);
  private readonly websiteService = inject(WebsiteService);
  private readonly httpErrorHandler = inject(HttpErrorHandlerService);
  private readonly notificationService = inject(NotificationService);
  private readonly destroy$ = new Subject<void>();

  protected readonly state = signal<EditorState>('loading');
  protected readonly saveState = signal<SaveState>('clean');
  protected readonly publishState = signal<PublishState>('idle');
  protected readonly website = signal<WebsiteDto | null>(null);
  protected readonly config = signal<WebsiteConfig | null>(null);
  protected readonly draftError = signal<string | null>(null);
  /** True when the editor started from an explicit user-chosen default. */
  protected readonly startingFromDefault = signal(false);
  protected readonly errorMessage = signal('');

  /** Public site URL, only meaningful while the website is published. */
  protected readonly publicSiteUrl = computed(() => {
    const site = this.website();
    return site?.isPublished
      ? buildPublicSiteUrl(environment.publicSiteBaseUrl, site.slug)
      : null;
  });

  /** Backend rejects publishing without a saved draft (verified in WebsiteService.PublishAsync). */
  protected readonly canPublish = computed(() => {
    const site = this.website();
    return !!site && !!this.config() && site.draftVersion != null && this.saveState() !== 'saving';
  });

  /** Publishing requires the server-side draft to be up to date with the editor. */
  protected readonly publishBlockedReason = computed((): string | null => {
    const site = this.website();

    if (!site) return null;
    if (this.saveState() === 'dirty' || this.saveState() === 'failed') {
      return 'Save your changes first — publishing uses the last saved draft, not unsaved edits.';
    }
    if (site.draftVersion == null) {
      return 'There is no saved draft configuration to publish yet.';
    }
    return null;
  });

  protected readonly publicationLabel = computed(() => {
    const site = this.website();

    if (!site) return '';

    if (site.isPublished) {
      return `Published${site.publishedVersion != null ? ` v${site.publishedVersion}` : ''}`;
    }

    return `${site.status}${site.draftVersion != null ? ` (draft v${site.draftVersion})` : ' (no draft yet)'}`;
  });

  protected readonly saveLabel = computed((): string => {
    switch (this.saveState()) {
      case 'dirty': return 'Unsaved changes';
      case 'saving': return 'Saving\u2026';
      case 'saved': return 'Saved';
      case 'failed': return 'Save failed \u2014 try again';
      default: return 'No changes yet';
    }
  });

  constructor() {
    // The :id route parameter is bound to the `id` input via
    // withComponentInputBinding; subscribe to paramMap as well so navigating
    // between two websites in the same component instance reloads state.
    this.route.paramMap
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const id = (params.get('id') ?? '').trim();

        if (!GUID_PATTERN.test(id)) {
          this.state.set('missing');
          return;
        }

        this.loadWebsite(id);
      });
  }

  protected onThemeChange(change: ThemeChange): void {
    const current = this.config();

    if (!current) return;

    this.config.update(cfg => {
      if (!cfg) return cfg;

      if (change.kind === 'color') {
        return {
          ...cfg,
          theme: {
            ...cfg.theme,
            colors: { ...(cfg.theme.colors ?? {}), [change.field]: change.value }
          }
        };
      }

      return { ...cfg, theme: { ...cfg.theme, font: change.value } };
    });

    if (this.saveState() !== 'saving') {
      this.saveState.set('dirty');
    }
  }

  protected saveDraft(): void {
    const site = this.website();
    const cfg = this.config();

    if (!site || !cfg || this.saveState() === 'saving') return;

    this.saveState.set('saving');

    this.websiteService
      .saveDraft(site.id, { configurationJson: serializeWebsiteConfig(cfg) })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: ApiResponse<WebsiteDto>) => {
          if (response.success) {
            // The backend returns the updated website metadata; draftVersion
            // in it confirms the draft was persisted server-side.
            if (response.data) {
              this.website.set(response.data);
            }
            this.startingFromDefault.set(false);
            this.saveState.set('saved');
            this.notificationService.success('Draft saved. The live site is unchanged until it is published.');
            return;
          }

          this.saveState.set('failed');
          this.notificationService.error(response.message ?? 'The draft could not be saved. Your changes are kept.');
        },
        error: (error: unknown) => {
          const details = this.httpErrorHandler.handle(error, {
            fallbackMessage: 'The draft could not be saved. Your changes are kept.'
          });

          this.saveState.set('failed');
          this.notificationService.error(
            details.message || Object.values(details.fieldErrors)[0] ||
              'The draft could not be saved. Your changes are kept.'
          );
        }
      });
  }

  protected retry(): void {
    const id = this.id().trim();

    if (GUID_PATTERN.test(id)) {
      this.loadWebsite(id);
    }
  }

  // ---------------- publishing ----------------

  protected confirmPublish(): void {
    if (!this.canPublish() || this.saveState() === 'saving') return;
    this.publishState.set('confirming');
  }

  protected cancelPublish(): void {
    this.publishState.set('idle');
  }

  /**
   * Publishes the SERVER-SIDE draft only. Local unsaved edits are never sent
   * implicitly — the backend freezes the stored draft version, so publishing
   * with unsaved changes would silently skip them. The UI requires a save
   * first when the editor is dirty.
   */
  protected executePublish(): void {
    const site = this.website();

    if (!site || this.publishState() !== 'confirming' || !this.canPublish()) return;

    this.publishState.set('publishing');

    this.websiteService.publish(site.id).subscribe({
      next: (response: ApiResponse<WebsiteDto>) => {
        if (response.success && response.data) {
          this.website.set(response.data);
          this.publishState.set('idle');
          this.notificationService.success(
            `${response.data.name} is now live at /${response.data.slug}.`
          );
          return;
        }

        this.publishState.set('idle');
        this.notificationService.error(
          response.message ?? 'Publication failed. Your published site is unchanged.'
        );
      },
      error: (error: unknown) => {
        const details = this.httpErrorHandler.handle(error, {
          fallbackMessage: 'Publication failed. Your published site is unchanged.'
        });
        this.publishState.set('idle');
        this.notificationService.error(details.message);
      }
    });
  }

  protected confirmUnpublish(): void {
    if (this.publishState() !== 'idle') return;
    this.publishState.set('unpublishing');

    const site = this.website();
    if (!site) return;

    this.websiteService.unpublish(site.id).subscribe({
      next: (response: ApiResponse<WebsiteDto>) => {
        if (response.success && response.data) {
          this.website.set(response.data);
          this.publishState.set('idle');
          this.notificationService.success(
            'The website is no longer publicly visible. Its draft configuration was kept.'
          );
          return;
        }

        this.publishState.set('idle');
        this.notificationService.error(
          response.message ?? 'Unpublishing failed. The site is still live.'
        );
      },
      error: (error: unknown) => {
        const details = this.httpErrorHandler.handle(error, {
          fallbackMessage: 'Unpublishing failed. The site is still live.'
        });
        this.publishState.set('idle');
        this.notificationService.error(details.message);
      }
    });
  }

  private loadWebsite(id: string): void {
    this.state.set('loading');
    this.errorMessage.set('');
    this.startingFromDefault.set(false);

    forkJoin({
      website: this.websiteService.getWebsite(id),
      draft: this.websiteService.getDraft(id)
    }).subscribe({
      next: ({ website, draft }: { website: ApiResponse<WebsiteDto>; draft: ApiResponse<WebsiteDraftDto> }) => {
        if (!website.success || !website.data) {
          this.errorMessage.set(
            website.message ?? 'Unable to load this website. Please try again.'
          );
          this.state.set(website.errorCode === 'NOT_FOUND' ? 'missing' : 'error');
          return;
        }

        this.website.set(website.data);

        // Draft retrieval failed while metadata succeeded: surface it as an
        // error state — never as "no draft exists".
        if (!draft.success || draft.data == null) {
          this.errorMessage.set(
            draft.message ?? 'The draft configuration could not be loaded. Please try again.'
          );
          this.state.set('error');
          return;
        }

        this.applyDraft(draft.data);
      },
      error: (error: unknown) => {
        this.errorMessage.set(
          this.httpErrorHandler.handle(error, {
            fallbackMessage: 'Unable to load this website. Please try again.'
          }).message
        );
        this.state.set('error');
      }
    });
  }

  private applyDraft(draft: WebsiteDraftDto): void {
    if (!draft.hasDraft || draft.configurationJson == null) {
      // A successful response explicitly reporting no saved draft. The editor
      // stays empty until the user chooses to start from a schema-valid
      // default; nothing is written to the server at this point.
      this.config.set(null);
      this.draftError.set(null);
      this.saveState.set('clean');
      this.state.set('no-draft');
      return;
    }

    const parsed = parseWebsiteConfig(draft.configurationJson);

    if (!parsed.config) {
      // Malformed/incompatible stored JSON: show the problem instead of
      // silently replacing it with defaults.
      this.config.set(null);
      this.draftError.set(parsed.error);
      this.saveState.set('clean');
      this.state.set('draft-invalid');
      return;
    }

    this.config.set(parsed.config);
    this.draftError.set(null);
    this.startingFromDefault.set(false);
    this.saveState.set('clean');
    this.state.set('ready');
  }

  /** Explicit user action for websites without a saved draft yet. */
  protected startFromDefault(): void {
    if (this.state() !== 'no-draft') return;

    this.config.set(createDefaultWebsiteConfig());
    this.startingFromDefault.set(true);
    this.saveState.set('dirty');
    this.state.set('ready');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
