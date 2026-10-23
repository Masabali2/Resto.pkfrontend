import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal
} from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { WebsiteService } from '../../../websites/services/website.service';
import { HttpErrorHandlerService } from '../../../../core/services/http-error-handler.service';
import { TemplateRenderer } from '../../../websites/components/template-renderer/template-renderer';
import { Button } from '../../../../shared/components/button/button';
import type { ApiResponse } from '../../../../core/models/api-response.model';
import type { WebsiteTemplateDto } from '../../../websites/models/website-template.model';
import type { WebsiteTemplateCatalogueItem } from '../../../websites/models/website-template-catalogue.model';
import { buildCatalogueItem } from '../../../websites/utils/website-template-catalogue.util';

export type TemplatePreviewViewport = 'desktop' | 'tablet' | 'mobile';

/**
 * Dedicated template preview page (`/templates/:id/preview`).
 *
 * The route parameter is the template **id** (the database GUID used by
 * `CreateWebsiteRequest.websiteTemplateId`), never the template key — the DTO
 * exposes both and the creation flow consumes the id. The backend has no
 * single-template endpoint, so the existing catalogue endpoint
 * (`GET v1/websites/templates`) is the source of truth; it is fetched exactly
 * once per load/retry and matched locally against the route id.
 *
 * Rendering reuses the one generic `TemplateRenderer` in `full` mode with the
 * parsed design configuration — there is no second renderer, no iframe and no
 * fabricated screenshot. The viewport switcher resizes a fixed-width stage so
 * the template's own responsive layout genuinely reflows at 1200 / 768 / 375 px.
 */
@Component({
  selector: 'app-template-preview',
  standalone: true,
  imports: [TemplateRenderer, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './template-preview.html',
  styleUrl: './template-preview.css'
})
export class TemplatePreview {
  private readonly websiteService = inject(WebsiteService);
  private readonly httpErrorHandler = inject(HttpErrorHandlerService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  /** Kept as an input so the component can also be tested/embedded directly. */
  readonly templateId = input(this.route.snapshot.paramMap.get('id') ?? '');

  protected readonly state = signal<'loading' | 'ready' | 'error' | 'not-found'>('loading');
  protected readonly errorMessage = signal('');
  protected readonly item = signal<WebsiteTemplateCatalogueItem | null>(null);

  protected readonly viewport = signal<TemplatePreviewViewport>('desktop');

  /**
   * Standalone template editing is not supported by the current product or
   * API: templates are platform-owned definitions, while the editor operates
   * on a tenant website instance (`/websites/:websiteId/editor`). A template
   * id is therefore never a valid website id, so this action stays disabled
   * with an explanation instead of navigating with a fabricated identifier.
   */
  readonly editTemplateUnavailable = output<void>();

  protected readonly template = computed(() => this.item()?.template ?? null);

  protected readonly category = computed(() => {
    const value = this.item()?.category?.trim() ?? '';

    return value.length > 0 ? value : null;
  });

  protected readonly tags = computed(() => this.item()?.tags ?? []);

  /**
   * The renderer consumes its validated `--tpl-*` custom properties from its
   * own host bindings. This frame only adds the stage chrome (shadow, radius,
   * clipping) and is deliberately free of any `--tpl-*` values so a template's
   * palette can never leak into dashboard chrome or other pages.
   */
  protected readonly viewportModes: readonly TemplatePreviewViewport[] = [
    'desktop',
    'tablet',
    'mobile'
  ];

  constructor() {
    this.load();
  }

  protected load(): void {
    // Guards against duplicate requests from initialization or repeated
    // retry clicks while a request is already in flight.
    if (this.state() === 'loading') {
      return;
    }

    const requestedId = this.templateId().trim();

    if (requestedId.length === 0) {
      this.state.set('not-found');
      return;
    }

    this.state.set('loading');
    this.errorMessage.set('');

    this.websiteService.getTemplates().subscribe({
      next: (response: ApiResponse<WebsiteTemplateDto[]>) => {
        if (!response.success || !response.data) {
          this.errorMessage.set(
            response.message ?? 'Unable to load this template. Please try again.'
          );
          this.state.set('error');
          return;
        }

        const match = response.data.find(entry => entry.id === requestedId) ?? null;

        if (!match) {
          this.state.set('not-found');
          return;
        }

        // Parsed once through the shared typed catalogue builder; malformed
        // configurations degrade to the safe fallback instead of crashing.
        this.item.set(buildCatalogueItem(match));
        this.state.set('ready');
      },
      error: (error: unknown) => {
        this.errorMessage.set(
          this.httpErrorHandler.handle(error, {
            fallbackMessage: 'Unable to load this template. Please try again.'
          }).message
        );
        this.state.set('error');
      }
    });
  }

  protected retry(): void {
    this.load();
  }

  protected setViewport(mode: TemplatePreviewViewport): void {
    this.viewport.set(mode);
  }

  protected viewportLabel(mode: TemplatePreviewViewport): string {
    return mode.charAt(0).toUpperCase() + mode.slice(1);
  }

  protected viewportWidth(mode: TemplatePreviewViewport): number {
    return VIEWPORT_WIDTHS[mode];
  }

  protected backToCatalogue(): void {
    void this.router.navigate(['/templates']);
  }

  /**
   * Starts the existing website-creation workflow with the selected template.
   * This does not create anything by itself — CreateWebsite still requires the
   * restaurant, name and slug before it calls the real API.
   */
  protected useThisTemplate(): void {
    const template = this.template();

    if (!template) {
      return;
    }

    void this.router.navigate(['/websites', 'new'], {
      queryParams: { templateId: template.id }
    });
  }

  protected explainEditUnavailable(): void {
    this.editTemplateUnavailable.emit();
  }
}

const VIEWPORT_WIDTHS: Record<TemplatePreviewViewport, number> = {
  desktop: 1200,
  tablet: 768,
  mobile: 375
};
