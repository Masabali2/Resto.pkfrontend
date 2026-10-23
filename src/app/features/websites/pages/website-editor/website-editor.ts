import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  OnDestroy,
  signal,
  OnInit
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin, Subject, takeUntil, switchMap, of, catchError } from 'rxjs';
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
import { TemplatePreviewDialog } from '../../components/template-preview-dialog/template-preview-dialog';
import {
  createDefaultWebsiteConfig,
  parseWebsiteConfig,
  serializeWebsiteConfig
} from '../../utils/website-config.util';
import { buildCatalogueItem } from '../../utils/website-template-catalogue.util';
import type { ApiResponse } from '../../../../core/models/api-response.model';
import type { WebsiteConfig } from '../../models/website-config.model';
import type { WebsiteDto } from '../../models/website.model';
import type { WebsiteDraftDto } from '../../models/website-draft.model';
import type { WebsiteTemplateDto } from '../../models/website-template.model';
import type { WebsiteTemplateCatalogueItem } from '../../models/website-template-catalogue.model';
import type { WebsiteTemplateDesignViewModel } from '../../models/website-template-design.model';
import type { RestaurantDto } from '../../../../core/models/restaurant.model';
import type { MenuItemDto } from '../../../menu/models/menu-item.model';

const GUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function buildPublicSiteUrl(baseUrl: string, slug: string): string | null {
  if (!baseUrl || !slug) return null;
  try {
    const url = new URL(`${baseUrl.replace(/\/+$/, '')}/${encodeURIComponent(slug)}`);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function slugFromName(name: string): string {
  return name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

@Component({
  selector: 'app-website-editor',
  standalone: true,
  imports: [
    RouterLink,
    Button,
    LoadingSpinner,
    EditorSettingsPanel,
    EditorToolbar,
    PreviewCanvas,
    CompareDialog,
    TemplatePreviewDialog
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
  protected readonly previewTemplateId = signal<string | null>(null);
  protected readonly autosaveStatus = signal<AutosaveState>({ status: 'idle', lastSaved: null, error: null });
  protected readonly showPreviewDialog = signal(false);

  protected readonly publicSiteUrl = computed(() => {
    const site = this.website();
    return site ? buildPublicSiteUrl('https://resto.pk', site.slug) : null;
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

  protected readonly previewTemplate = computed<WebsiteTemplateCatalogueItem | null>(() =>
    this.templates().find(t => t.template.id === this.previewTemplateId()) ?? null
  );

  constructor() {
    effect(() => {
      const status = this.autosaveStatus();
      if (status.status === 'saved') {
        this.saveState.set('saved');
        setTimeout(() => this.saveState.set('clean'), 3000);
      } else if (status.status === 'failed') {
        this.saveState.set('failed');
      } else if (status.status === 'saving') {
        this.saveState.set('saving');
      }
    });
  }

  ngOnInit(): void {
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

    this.autosaveService.getStatus().pipe(takeUntil(this.destroy$)).subscribe(status => {
      this.autosaveStatus.set(status);
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
          section.type === 'menu-preview'
            ? { ...section, settings: { ...section.settings, featuredItemIds: change.itemIds } }
            : section
        )
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

  private applyTemplateDesign(currentConfig: WebsiteConfig | null, design: WebsiteTemplateDesignViewModel): WebsiteConfig {
    const baseConfig = currentConfig ?? createDefaultWebsiteConfig();

    const templateColors = design.configuration.design.palette;
    const colorMap: Record<string, string> = {
      primary: templateColors.primary,
      secondary: templateColors.accent,
      accent: templateColors.accent,
      background: templateColors.background,
      text: templateColors.text
    };

    return {
      ...baseConfig,
      schemaVersion: 1,
      theme: {
        ...baseConfig.theme,
        colors: { ...baseConfig.theme.colors, ...colorMap },
        font: design.configuration.design.typography.bodyFont
      },
      sections: design.sections.map(s => ({
        type: s.type,
        enabled: s.enabled,
        order: s.order,
        settings: this.getDefaultSectionSettings(s.type)
      })),
      settings: {},
      extraTopLevel: baseConfig.extraTopLevel
    };
  }

  private getDefaultSectionSettings(type: string): Record<string, unknown> {
    const defaults: Record<string, Record<string, unknown>> = {
      hero: { heading: '', subheading: '', ctaText: 'View Menu', imageUrl: '' },
      'menu-preview': { heading: 'Our Menu', featuredItemIds: [] },
      about: { heading: 'Our Story', body: '' },
      contact: { phone: '', email: '', address: '', instagram: '' },
      hours: { hours: { monday: '', tuesday: '', wednesday: '', thursday: '', friday: '', saturday: '', sunday: '' } },
      gallery: { heading: 'Gallery' },
      footer: { copyright: '' },
      banner: { message: '' },
      testimonials: { heading: 'Testimonials', quotes: [] }
    };
    return defaults[type] ?? {};
  }

  private markDirty(): void {
    if (this.saveState() !== 'saving') {
      this.saveState.set('dirty');
    }
  }

  protected async saveDraft(): Promise<void> {
    const site = this.website();
    const cfg = this.config();

    if (!site || !cfg || this.saveState() === 'saving') return;

    this.saveState.set('saving');

    try {
      await this.autosaveService.flushPending();
      this.notificationService.success('Draft saved. The live site is unchanged until it is published.');
    } catch (error) {
      this.saveState.set('failed');
      const details = this.httpErrorHandler.handle(error, {
        fallbackMessage: 'The draft could not be saved. Your changes are kept.'
      });
      this.notificationService.error(
        details.message || 'The draft could not be saved. Your changes are kept.'
      );
    }
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
    this.showPreviewDialog.set(true);
  }

  protected closePreview(): void {
    this.showPreviewDialog.set(false);
  }

  protected retry(): void {
    const id = this.id().trim();
    if (GUID_PATTERN.test(id)) {
      this.loadWebsite(id);
    }
  }

  protected startFromDefault(): void {
    if (this.state() !== 'no-draft') return;

    this.config.set(createDefaultWebsiteConfig());
    this.startingFromDefault.set(true);
    this.saveState.set('dirty');
    this.state.set('ready');
  }

  private loadWebsite(id: string): void {
    this.state.set('loading');
    this.errorMessage.set('');
    this.startingFromDefault.set(false);

    forkJoin({
      website: this.websiteService.getWebsite(id),
      draft: this.websiteService.getDraft(id),
      restaurant: this.loadRestaurantForWebsite(id)
    }).subscribe({
      next: ({ website, draft, restaurant }) => {
        if (!website.success || !website.data) {
          this.errorMessage.set(
            website.message ?? 'Unable to load this website. Please try again.'
          );
          this.state.set(website.errorCode === 'NOT_FOUND' ? 'missing' : 'error');
          return;
        }

        this.website.set(website.data);
        if (restaurant?.success && restaurant.data) this.restaurant.set(restaurant.data);

        if (!draft.success || draft.data == null) {
          this.errorMessage.set(
            draft.message ?? 'The draft configuration could not be loaded. Please try again.'
          );
          this.state.set('error');
          return;
        }

        this.applyDraft(draft.data);
        this.loadTemplates(website.data.websiteTemplateId);
        this.loadMenuItems(website.data.restaurantId);
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

  private loadRestaurantForWebsite(websiteId: string) {
    return this.websiteService.getWebsite(websiteId).pipe(
      switchMap(response => {
        if (response.success && response.data) {
          return this.restaurantService.getRestaurantById(response.data.restaurantId);
        }
        return of({ success: false, data: null } as ApiResponse<RestaurantDto>);
      }),
      catchError(() => of({ success: false, data: null } as ApiResponse<RestaurantDto>))
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

  private loadTemplates(currentTemplateId?: string): void {
    this.websiteService.getTemplates().pipe(takeUntil(this.destroy$)).subscribe({
      next: (response: ApiResponse<WebsiteTemplateDto[]>) => {
        if (response.success && response.data) {
          const items = response.data
            .map(t => buildCatalogueItem(t))
            .sort((a, b) => a.displayOrder - b.displayOrder || a.template.name.localeCompare(b.template.name));
          this.templates.set(items);
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

  protected onPreviewDialogUse(): void {
    const item = this.templates().find(t => t.template.id === this.previewTemplateId());
    if (item) {
      this.onTemplateChange({ templateId: item.template.id, templateKey: item.template.templateKey });
    }
    this.closePreview();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}