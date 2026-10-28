import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnDestroy,
  signal,
  OnInit
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable, Subject, takeUntil, switchMap, map, of, combineLatest, type Observer } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MenuService } from '../../../menu/services/menu.service';
import { RestaurantService } from '../../../../core/services/restaurant.service';
import { WebsiteService } from '../../services/website.service';
import { WebsiteAutosaveService, type AutosaveState } from '../../services/website-autosave.service';
import { WebsiteCompareService } from '../../services/website-compare.service';
import { HttpErrorHandlerService } from '../../../../core/services/http-error-handler.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Button } from '../../../../shared/components/button/button';
import { LoadingSpinner } from '../../../../shared/components/loading-spinner/loading-spinner';
import { EditorSettingsPanel, type SectionConfigChange, type ThemeChange, type TemplateChange, type FeaturedDishesChange } from '../../components/editor-settings-panel/editor-settings-panel';
import { EditorToolbar, type ViewportMode, type CompareData, type ConfigDifference, type EditorState, type SaveState, type PublishState } from '../../components/editor-toolbar/editor-toolbar';
import { PreviewCanvas } from '../../components/preview-canvas/preview-canvas';
import { CompareDialog } from '../../components/compare-dialog/compare-dialog';
import { ImageUploadComponent } from '../../../../shared/components/image-upload/image-upload.component';
import {
  createDefaultWebsiteConfig,
  parseWebsiteConfig,
  serializeWebsiteConfig,
  type ThemeColorField
} from '../../utils/website-config.util';
import { buildCatalogueItem } from '../../utils/website-template-catalogue.util';
import type { ApiResponse } from '../../../../core/models/api-response.model';
import type { WebsiteConfig, WebsiteSectionConfig } from '../../models/website-config.model';
import type { WebsiteDto } from '../../models/website.model';
import type { WebsiteDraftDto } from '../../models/website-draft.model';
import type { WebsiteTemplateDto } from '../../models/website-template.model';
import type { WebsiteTemplateCatalogueItem } from '../../models/website-template-catalogue.model';
import type { TemplateSectionType } from '../../models/website-template-design.model';
import type { RestaurantDto } from '../../../../core/models/restaurant.model';
import type { MenuItemDto } from '../../../menu/models/menu-item.model';

import { environment } from '../../../../../environments/environment';

const GUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Composes the public URL of a published site from the deployment-configured
 * base URL and the actual website slug. When no base URL is configured for
 * the environment (relative-path mode) the slug path alone is returned; an
 * invalid slug yields null so the UI never renders a fabricated domain.
 */
export function buildPublicSiteUrl(baseUrl: string, slug: string): string | null {
  if (!slug) return null;
  try {
    const url = new URL(`${baseUrl.replace(/\/+$/, '')}/${encodeURIComponent(slug)}`);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

@Component({
  selector: 'app-website-editor',
  standalone: true,
  imports: [
    RouterLink,
    Button,
    LoadingSpinner,
    EditorSettingsPanel,
    ImageUploadComponent,
    EditorToolbar,
    PreviewCanvas,
    CompareDialog
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './website-editor.html',
  styleUrl: './website-editor.css'
})
export class WebsiteEditor implements OnInit, OnDestroy {
  readonly id = input('');

  private readonly route = inject(ActivatedRoute);
  private readonly websiteService = inject(WebsiteService);
  private readonly menuService = inject(MenuService);
  private readonly restaurantService = inject(RestaurantService);
  private readonly autosaveService = inject(WebsiteAutosaveService);
  private readonly compareService = inject(WebsiteCompareService);
  private readonly httpErrorHandler = inject(HttpErrorHandlerService);
  private readonly notificationService = inject(NotificationService);
  private readonly destroy$ = new Subject<void>();

  protected readonly state = signal<EditorState>('loading');
  protected readonly saveState = signal<SaveState>('clean');
  /** Revision confirmed persisted by the autosave pipeline. */
  private readonly savedVersion = signal(0);
  /** Monotonic revision of the latest local edit. */
  private readonly localVersion = signal(0);
  /** True while a save request for some revision is in flight. */
  private readonly saveInFlight = signal(false);
  private lastConfirmedSaveAt: Date | null = null;
  private savedResetTimer: ReturnType<typeof setTimeout> | null = null;
  protected readonly publishState = signal<PublishState>('idle');
  protected readonly viewportMode = signal<ViewportMode>('desktop');
  protected readonly website = signal<WebsiteDto | null>(null);
  protected readonly config = signal<WebsiteConfig | null>(null);
  protected readonly restaurant = signal<RestaurantDto | null>(null);
  protected readonly menuItems = signal<readonly MenuItemDto[]>([]);
  protected readonly templates = signal<WebsiteTemplateCatalogueItem[]>([]);
  protected readonly draftError = signal<string | null>(null);
  protected readonly startingFromDefault = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly isComparing = signal(false);
  protected readonly compareData = signal<CompareData | null>(null);
  protected readonly autosaveStatus = signal<AutosaveState>({
    status: 'idle',
    savedVersion: 0,
    lastSaved: null,
    error: null
  });

  /**
   * The toolbar "Preview" opens a live preview of the CURRENT editor
   * configuration (rendered through the same renderer as the canvas), so it
   * never depends on a separately-tracked template id that could be unset.
   */
  protected readonly showLivePreview = signal(false);

  /**
   * Test seam: resolves once the autosave status stream has been observed at
   * least once after `savedVersion` reaches or exceeds `localVersion`. Used to
   * avoid timing-sensitive assertions on transient 'saved' feedback.
   */
  readonly firstSavedConfirmation = new Promise<void>(resolve => {
    const sub = this.autosaveService.status$.subscribe(status => {
      if (status.savedVersion >= this.localVersion()) {
        resolve();
        sub.unsubscribe();
      }
    });
  });

  protected readonly publicSiteUrl = computed(() => {
    const site = this.website();
    if (!site) return null;
    // Only ever advertised for sites the server actually reports as live.
    if (!site.isPublished) return null;
    return buildPublicSiteUrl(environment.publicSiteBaseUrl, site.slug);
  });

  protected readonly canPublish = computed(() => {
    const site = this.website();
    return !!site && !!this.config() && site.draftVersion != null && this.saveState() !== 'saving';
  });

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

  protected readonly hasUnsavedChanges = computed(() => this.saveState() === 'dirty' || this.saveState() === 'failed');

  protected readonly selectedTemplateItem = computed(() =>
    this.templates().find(t => t.template.id === this.website()?.websiteTemplateId) ?? null
  );

  /**
   * Derives the toolbar save state from explicit revision tracking:
   * - 'saving' while any save is in flight,
   * - 'saved' briefly after the latest revision was confirmed persisted,
   * - 'dirty' whenever newer local edits exist (or a save failed),
   * - 'clean' only when nothing has been edited since load/reset.
   */
  private syncSaveState(): void {
    if (this.saveInFlight()) {
      this.saveState.set('saving');
      return;
    }

    const pending = this.localVersion() > this.savedVersion();

    if (!pending && this.lastConfirmedSaveAt) {
      this.saveState.set('saved');
      if (this.savedResetTimer === null) {
        this.savedResetTimer = setTimeout(() => {
          this.savedResetTimer = null;
          if (!this.saveInFlight() && this.localVersion() <= this.savedVersion()) {
            this.saveState.set('clean');
          }
        }, 3000);
      }
      return;
    }

    if (this.savedResetTimer !== null) {
      clearTimeout(this.savedResetTimer);
      this.savedResetTimer = null;
    }

    this.saveState.set(pending ? 'dirty' : 'clean');
  }

  ngOnInit(): void {
    // Subscribing BEFORE route processing guarantees no status event emitted
    // during initial loading can be missed.
    this.autosaveService.status$.pipe(takeUntil(this.destroy$)).subscribe(status => {
      this.autosaveStatus.set(status);
      this.saveInFlight.set(status.status === 'saving');
      if (status.savedVersion > this.savedVersion()) {
        this.savedVersion.set(status.savedVersion);
        this.lastConfirmedSaveAt = status.lastSaved;
      }
      if (status.status === 'failed') {
        // Explicit failure always surfaces, independent of version math.
        this.saveState.set('failed');
        return;
      }
      this.syncSaveState();
    });

    this.route.paramMap
      .pipe(
        // Ignore stale route events for a website that is no longer selected.
        takeUntil(this.destroy$),
        switchMap(params => {
          const id = (params.get('id') ?? '').trim();

          if (!GUID_PATTERN.test(id)) {
            this.state.set('missing');
            return of(null);
          }

          return this.loadWebsiteAndApply(id);
        })
      )
      .subscribe({
        next: loaded => {
          if (loaded === null) return;
          if (!loaded.ok) {
            this.errorMessage.set(loaded.message ?? 'Unable to load this website.');
            this.state.set(loaded.notFound ? 'missing' : 'error');
          }
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

  /**
   * Centralized, single-source mapping between template design section types
   * (`header|hero|menu|about|gallery|contact|footer`) and website draft
   * section types (`hero|menu-preview|about|gallery|contact|hours|map|footer|
   * banner|testimonials`). Both the renderer switch and the settings panel
   * consume this map so a `menu` template section never falls through to an
   * unmatched `menu-preview` case (and vice versa).
   */
  private static readonly WEBSITE_TO_TEMPLATE_SECTION: Readonly<Record<string, TemplateSectionType>> = {
    'menu-preview': 'menu'
  };

  private static toTemplateSectionType(type: string | undefined): TemplateSectionType | null {
    if (!type) return null;
    const mapped = WebsiteEditor.WEBSITE_TO_TEMPLATE_SECTION[type];
    return mapped ?? (type as TemplateSectionType);
  }

  /**
   * Inverse of `WEBSITE_TO_TEMPLATE_SECTION`: maps a template design section
   * type onto the website draft vocabulary used by the parser, renderer
   * switch, and settings panel. Types that are identical in both vocabularies
   * pass through unchanged.
   */
  private static toWebsiteSectionType(type: TemplateSectionType | string): string {
    for (const [websiteType, templateType] of Object.entries(WebsiteEditor.WEBSITE_TO_TEMPLATE_SECTION)) {
      if (templateType === type) return websiteType;
    }
    return type;
  }

  protected onThemeChange(change: ThemeChange): void {
    const current = this.config();
    if (!current) return;

    // Canonical schema location: theme.colors.<name> for colors, theme.font
    // for typography. Unrelated theme keys (and unknown color keys saved by
    // older drafts) are preserved via spread — no competing top-level props.
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

    this.markDirty();
  }

  protected onSectionConfigChange(change: SectionConfigChange): void {
    this.config.update(cfg => {
      if (!cfg) return cfg;

      return {
        ...cfg,
        sections: cfg.sections.map(section =>
          section.type === change.sectionType
            ? { ...section, settings: { ...section.settings, ...change.settings } }
            : section
        )
      };
    });

    this.markDirty();
  }

  protected onFeaturedDishesChange(change: FeaturedDishesChange): void {
    this.config.update(cfg => {
      if (!cfg) return cfg;

      return {
        ...cfg,
        sections: cfg.sections.map(section =>
          section.type === 'menu-preview' || section.type === 'menu'
            ? { ...section, settings: { ...section.settings, featuredItemIds: change.itemIds } }
            : section
        )
      };
    });

    this.markDirty();
  }

  protected onLogoAssetChange(assetId: string): void {
    this.config.update(cfg => {
      if (!cfg) return cfg;
      return {
        ...cfg,
        settings: { ...cfg.settings, logoAssetId: assetId }
      };
    });
    this.markDirty();
  }

  protected async onTemplateChange(change: TemplateChange): Promise<void> {
    const currentConfig = this.config();
    const targetTemplate = this.templates().find(t => t.template.id === change.templateId);

    if (!targetTemplate || !targetTemplate.design) {
      this.notificationService.error('Cannot switch to this template: design configuration unavailable.');
      return;
    }

    const newConfig = this.applyTemplateDesign(currentConfig, targetTemplate.design);

    this.config.set(newConfig);
    this.website.update(site => site ? { ...site, websiteTemplateId: change.templateId, templateName: targetTemplate.template.name, templateKey: targetTemplate.template.templateKey } : null);
    this.markDirty();
    this.notificationService.info(`Switched to "${targetTemplate.template.name}". Review your content and save.`);
  }

  private applyTemplateDesign(
    currentConfig: WebsiteConfig | null,
    design: NonNullable<WebsiteTemplateCatalogueItem['design']>
  ): WebsiteConfig {
    const baseConfig = currentConfig ?? createDefaultWebsiteConfig();

    const templateColors = design.configuration.design.palette;
    // Only non-empty palette values override existing user colors; empty
    // strings from malformed seeds never erase valid settings.
    const colorMap: Partial<Record<ThemeColorField, string>> = {};
    const assign = (field: ThemeColorField, value: string | undefined): void => {
      if (typeof value === 'string' && value.trim().length > 0) colorMap[field] = value;
    };
    assign('primary', templateColors.primary);
    assign('secondary', templateColors.accent);
    assign('accent', templateColors.accent);
    assign('background', templateColors.background);
    assign('text', templateColors.text);

    // Preserve existing section settings by section type so switching
    // templates does not erase unrelated editor content. New section order
    // and enabled flags come from the template.
    const previousSettingsByType = new Map<string, Record<string, unknown>>();
    for (const section of baseConfig.sections) {
      if (typeof section.type === 'string' && section.settings) {
        previousSettingsByType.set(section.type, section.settings);
      }
    }

    const sections: WebsiteSectionConfig[] = design.sections
      .filter(s => s.enabled)
      .sort((a, b) => a.order - b.order)
      .map(s => {
        const websiteType = WebsiteEditor.toWebsiteSectionType(s.type);
        const existing = previousSettingsByType.get(websiteType);
        const defaults = this.getDefaultSectionSettings(websiteType);
        return {
          type: websiteType,
          enabled: true,
          order: s.order,
          settings: existing ?? defaults
        };
      });

    return {
      ...baseConfig,
      schemaVersion: 1,
      theme: {
        ...baseConfig.theme,
        colors: { ...(baseConfig.theme.colors ?? {}), ...colorMap },
        font: baseConfig.theme.font ?? design.configuration.design.typography.bodyFont
      },
      sections,
      settings: baseConfig.settings ?? {},
      extraTopLevel: baseConfig.extraTopLevel
    };
  }

  /**
   * Defaults contain only meaningful placeholder labels. Empty-string fields
   * are deliberately NOT seeded here — they would overwrite real user
   * content when a template is applied. Missing keys simply fall back to the
   * renderer's safe defaults.
   */
  private getDefaultSectionSettings(type: string): Record<string, unknown> {
    const defaults: Record<string, Record<string, unknown>> = {
      hero: { ctaText: 'View Menu' },
      'menu-preview': { heading: 'Our Menu' },
      about: { heading: 'Our Story' },
      hours: {},
      gallery: { heading: 'Gallery' },
      banner: {},
      testimonials: { heading: 'Testimonials' }
    };
    return defaults[type] ?? {};
  }

  /**
   * Marks the session dirty AND enqueues a debounced autosave of the latest
   * snapshot. The local revision counter guarantees that confirmations of
   * older requests can never mark newer edits as saved.
   */
  private markDirty(): void {
    const site = this.website();
    const cfg = this.config();

    if (!site || !cfg) return;

    this.localVersion.update(v => v + 1);
    this.autosaveService.triggerSave(site.id, cfg);
    this.syncSaveState();
  }

  protected async saveDraft(): Promise<void> {
    const site = this.website();
    const cfg = this.config();

    if (!site || !cfg || this.saveState() === 'saving') return;

    // Ensure the current in-memory config is queued even if markDirty was
    // skipped (e.g. restored session with unsaved state after reload).
    this.autosaveService.triggerSave(site.id, cfg);

    try {
      // Resolves ONLY after the save covering the latest revision succeeded.
      await this.autosaveService.saveNow();
      this.notificationService.success('Draft saved. The live site is unchanged until it is published.');
    } catch (error) {
      this.saveState.set('failed');
      const details =
        error instanceof Error && error.message
          ? { message: error.message }
          : this.httpErrorHandler.handle(error, {
              fallbackMessage: 'The draft could not be saved. Your changes are kept.'
            });
      this.notificationService.error(
        details.message || 'The draft could not be saved. Your changes are kept.'
      );
    }
  }

  protected retrySave(): void {
    this.autosaveService.retry();
  }

  protected confirmPublish(): void {
    if (!this.canPublish() || this.saveState() === 'saving') return;
    this.publishState.set('confirming');
  }

  protected cancelPublish(): void {
    this.publishState.set('idle');
  }

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

  protected async compareChanges(): Promise<void> {
    const site = this.website();
    const cfg = this.config();

    if (!site || !cfg) return;

    this.isComparing.set(true);

    try {
      const comparison = await this.compareService.compareDraftWithPublished(site.id, cfg);
      this.compareData.set(comparison);
    } catch (error) {
      const details = this.httpErrorHandler.handle(error, {
        fallbackMessage: 'Unable to compare changes.'
      });
      this.notificationService.error(details.message);
      this.isComparing.set(false);
    }
  }

  protected closeCompare(): void {
    this.isComparing.set(false);
    this.compareData.set(null);
  }

  protected onViewportChange(mode: ViewportMode): void {
    this.viewportMode.set(mode);
  }

  protected openPreview(): void {
    // Live preview of the CURRENT editor configuration — never depends on a
    // separately-tracked template id that could be unset.
    this.showLivePreview.set(true);
  }

  protected closePreview(): void {
    this.showLivePreview.set(false);
  }

  protected retry(): void {
    const id = this.id().trim();
    if (!GUID_PATTERN.test(id)) {
      this.state.set('missing');
      return;
    }
    // `loadWebsite` already funnels transport errors into an ok:false result,
    // so no separate error handler is needed here.
    this.loadWebsiteAndApply(id).subscribe(loaded => {
      if (loaded === null || loaded.ok) return;
      this.errorMessage.set(loaded.message ?? 'Unable to load this website. Please try again.');
      this.state.set(loaded.notFound ? 'missing' : 'error');
    });
  }

  protected startFromDefault(): void {
    if (this.state() !== 'no-draft') return;

    this.config.set(createDefaultWebsiteConfig());
    this.startingFromDefault.set(true);
    this.saveState.set('dirty');
    this.state.set('ready');
  }

  /**
   * Loads the website, its draft, and (in parallel where possible) its
   * restaurant in ONE pass — `getWebsite` is requested exactly once per load.
   * Returns a result object instead of mutating state so callers can compose
   * it inside `switchMap`, which discards stale responses when the route id
   * changes mid-flight. Side effects that must only run for the CURRENT
   * website (templates, menu items, applied draft) are performed by
   * `loadWebsiteAndApply`.
   */
  private loadWebsite(id: string): Observable<
    | { ok: true; website: WebsiteDto; draft: ApiResponse<WebsiteDraftDto> | null; restaurant: ApiResponse<RestaurantDto> | null }
    | { ok: false; message: string; notFound: boolean }
  > {
    this.state.set('loading');
    this.errorMessage.set('');
    this.startingFromDefault.set(false);

    return this.websiteService.getWebsite(id).pipe(
      switchMap(websiteResponse => {
        if (!websiteResponse.success || !websiteResponse.data) {
          return of({
            ok: false as const,
            message:
              websiteResponse.message ?? 'Unable to load this website. Please try again.',
            notFound: websiteResponse.errorCode === 'NOT_FOUND'
          });
        }

        const site = websiteResponse.data;
        // Independent resources fetched in parallel; failures degrade to null
        // so the editor can still open without restaurant context.
        const restaurant$ = this.restaurantService
          .getRestaurantById(site.restaurantId)
          .pipe(catchError(() => of(null)));
        const draft$ = this.websiteService.getDraft(id).pipe(catchError(() => of(null)));

        return combineLatest({ draft: draft$, restaurant: restaurant$ }).pipe(
          map(({ draft, restaurant }) => ({
            ok: true as const,
            website: site,
            draft,
            restaurant
          }))
        );
      }),
      catchError((error: unknown) => {
        const details = this.httpErrorHandler.handle(error, {
          fallbackMessage: 'Unable to load this website. Please try again.'
        });
        return of({ ok: false as const, message: details.message, notFound: false });
      })
    );
  }

  private loadWebsiteAndApply(
    id: string
  ): Observable<{ ok: boolean; message?: string; notFound?: boolean } | null> {
    return this.loadWebsite(id).pipe(
      switchMap(result => {
        if (!result.ok) {
          return of({ ok: false as const, message: result.message, notFound: result.notFound });
        }

        this.website.set(result.website);
        if (result.restaurant?.success && result.restaurant.data) {
          this.restaurant.set(result.restaurant.data);
        }

        // Load the catalogue so a website created from a template can be
        // initialized with that template's design configuration when no draft
        // exists yet. The catalogue load is part of this chain so stale
        // responses are discarded when the route id changes mid-flight.
        return this.websiteService.getTemplates().pipe(
          map(response => {
            const templates: WebsiteTemplateCatalogueItem[] = [];

            if (response.success && response.data) {
              const items = response.data
                .map(t => buildCatalogueItem(t))
                .sort(
                  (a, b) =>
                    a.displayOrder - b.displayOrder ||
                    a.template.name.localeCompare(b.template.name)
                );
              templates.push(...items);
              this.templates.set(items);
            }

            const draft = result.draft;

            // Draft load failure → error state.
            if (draft == null || !draft.success) {
              return {
                ok: false as const,
                message:
                  (draft?.message ?? 'The draft configuration could not be loaded. Please try again.'),
                notFound: false
              };
            }

            const draftData = draft.data;

            // No draft payload at all → error state.
            if (draftData == null) {
              return {
                ok: false as const,
                message: 'The draft configuration could not be loaded. Please try again.',
                notFound: false
              };
            }

            // No draft exists yet. If the website references a template,
            // apply its design configuration as the starting point so the
            // editor opens with the selected template rather than a blank
            // default layout. Otherwise fall back to the no-draft entry
            // point where the user can start from a basic layout.
            if (!draftData.hasDraft || draftData.configurationJson == null) {
              const templateId = result.website.websiteTemplateId;
              const template = templates.find(t => t.template.id === templateId);

              if (template?.design) {
                const config = this.applyTemplateDesign(
                  createDefaultWebsiteConfig(),
                  template.design
                );
                this.config.set(config);
                this.website.update(site =>
                  site ? {
                    ...site,
                    websiteTemplateId: template.template.id,
                    templateName: template.template.name,
                    templateKey: template.template.templateKey
                  } : null
                );
                this.startingFromDefault.set(false);
                this.saveState.set('clean');
                this.state.set('ready');
                this.autosaveService.reset();
              } else {
                this.config.set(null);
                this.draftError.set(null);
                this.saveState.set('clean');
                this.state.set('no-draft');
              }

              this.loadMenuItems(result.website.restaurantId);
              return { ok: true as const };
            }

            this.applyDraft(draftData);
            this.loadMenuItems(result.website.restaurantId);
            return { ok: true as const };
          })
        );
      })
    );
  }

  private loadMenuItems(restaurantId: string): void {
    this.menuService.getMenus(restaurantId, 1, 5).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response: ApiResponse<any>) => {
        if (response.success && response.data?.items?.length) {
          const menuId = response.data.items[0].id;
          this.menuService.getMenuItems(menuId, 1, 50).pipe(takeUntil(this.destroy$)).subscribe({
            next: (itemsResponse: ApiResponse<any>) => {
              if (itemsResponse.success && itemsResponse.data?.items) {
                this.menuItems.set(itemsResponse.data.items);
              }
            }
          });
        }
      }
    });
  }

  private applyDraft(draft: WebsiteDraftDto): void {
    if (!draft.hasDraft || draft.configurationJson == null) {
      this.config.set(null);
      this.draftError.set(null);
      this.saveState.set('clean');
      this.state.set('no-draft');
      return;
    }

    const parsed = parseWebsiteConfig(draft.configurationJson);

    if (!parsed.config) {
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

    this.autosaveService.reset();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}