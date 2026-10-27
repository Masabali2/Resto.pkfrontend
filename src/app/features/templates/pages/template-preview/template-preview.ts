import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { combineLatest } from 'rxjs';
import { WebsiteService } from '../../../websites/services/website.service';
import { AuthorizationService } from '../../../../core/services/authorization.service';
import { HttpErrorHandlerService } from '../../../../core/services/http-error-handler.service';
import { TemplateRenderer } from '../../../websites/components/template-renderer/template-renderer';
import { Button } from '../../../../shared/components/button/button';
import type { ApiResponse } from '../../../../core/models/api-response.model';
import type { PublicWebsiteTemplateDto } from '../../../websites/models/website-template.model';
import type { WebsiteTemplateCatalogueItem } from '../../../websites/models/website-template-catalogue.model';
import { buildCatalogueItem } from '../../../websites/utils/website-template-catalogue.util';

export type TemplatePreviewViewport = 'desktop' | 'tablet' | 'mobile';

const VIEWPORT_WIDTHS: Record<TemplatePreviewViewport, number> = {
  desktop: 1200,
  tablet: 768,
  mobile: 375
};

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Dedicated template preview page (`/templates/:id/preview`).
 *
 * The route parameter is the template **id** (the database GUID consumed by
 * `CreateWebsiteRequest.websiteTemplateId`), never the template key. The
 * backend has no single-template public endpoint, so the anonymous public
 * catalogue (`GET api/v1/public/website-templates`) is the source of truth; it
 * is fetched at most once per template id and matched locally. This keeps
 * deep links and refreshes working for signed-out visitors.
 *
 * Rendering reuses the one generic `TemplateRenderer` in `full` mode with the
 * parsed design configuration — there is no iframe, no second renderer and no
 * fabricated screenshot. The viewport switcher resizes the stage so the
 * template's own responsive layout genuinely reflows at 1200 / 768 / 375 px,
 * and the rendered header/footer navigation scrolls to the real sections.
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
  private readonly authorization = inject(AuthorizationService);
  private readonly httpErrorHandler = inject(HttpErrorHandlerService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly state = signal<'loading' | 'ready' | 'error' | 'not-found'>(
    'loading'
  );
  protected readonly errorMessage = signal('');
  protected readonly item = signal<
    WebsiteTemplateCatalogueItem<PublicWebsiteTemplateDto> | null
  >(null);

  protected readonly viewport = signal<TemplatePreviewViewport>('desktop');

  /** True when the visitor is already signed in (drives the primary action). */
  protected readonly isAuthenticated = this.authorization.isAuthenticated;

  private readonly fromCatalogue = signal(false);

  protected readonly template = computed<PublicWebsiteTemplateDto | null>(
    () => this.item()?.template ?? null
  );

  protected readonly design = computed(() => this.item()?.design ?? null);

  protected readonly category = computed(() => {
    const value = this.item()?.category?.trim() ?? '';

    return value.length > 0 ? value : null;
  });

  protected readonly tags = computed(() => this.item()?.tags ?? []);

  protected readonly viewportModes: readonly TemplatePreviewViewport[] = [
    'desktop',
    'tablet',
    'mobile'
  ];

  protected readonly backHref = computed(() =>
    this.fromCatalogue() ? '/templates' : '/#templates'
  );

  protected readonly backLabel = computed(() =>
    this.fromCatalogue() ? 'Back to Templates' : 'Back to Home'
  );

  /** Template id of the current route, kept for retries and stale responses. */
  private currentId = '';
  private loadedForId: string | null = null;
  private loadingInFlight = false;

  constructor() {
    // React to direct navigation as well as in-app preview-to-preview moves.
    // The query parameter only changes the back-navigation target, so it never
    // causes a second catalogue request for the same template.
    combineLatest([this.route.paramMap, this.route.queryParamMap])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([params, queryParams]) => {
        this.fromCatalogue.set(queryParams.get('from') === 'catalogue');

        const id = (params.get('id') ?? '').trim();
        this.currentId = id;

        if (id !== this.loadedForId) {
          this.load();
        }
      });
  }

  /**
   * Loads the catalogue and resolves the route id against it.
   *
   * A newer navigation supersedes an in-flight request: stale responses are
   * ignored by comparing the id captured at request time with the route id.
   */
  protected load(): void {
    const requestedId = this.currentId;

    if (this.loadingInFlight && requestedId === this.loadedForId) {
      return;
    }

    this.loadedForId = requestedId;
    this.item.set(null);
    this.errorMessage.set('');

    if (requestedId.length === 0) {
      this.loadingInFlight = false;
      this.state.set('not-found');
      return;
    }

    this.loadingInFlight = true;
    this.state.set('loading');

    this.websiteService
      .getPublicTemplates()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response: ApiResponse<PublicWebsiteTemplateDto[]>) => {
          if (requestedId !== this.currentId) {
            return;
          }

          this.loadingInFlight = false;

          if (!response.success || !response.data) {
            this.errorMessage.set(
              response.message ?? 'Unable to load this template. Please try again.'
            );
            this.state.set('error');
            return;
          }

          const normalisedId = requestedId.toLowerCase();
          const match =
            response.data.find(
              entry => entry.id.toLowerCase() === normalisedId
            ) ?? null;

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
          if (requestedId !== this.currentId) {
            return;
          }

          this.loadingInFlight = false;

          // The public catalogue is anonymous, so a 401/403 is never an
          // expected state: it means the request hit a different/protected
          // endpoint or was rewritten by an interceptor. Report a normal load
          // failure with retry rather than asking the visitor to sign in.
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

  /**
   * Returns to the page the visitor came from. Catalogue links carry
   * `?from=catalogue`; every other entry point returns to the home showcase
   * section, which is scrolled into view after navigation (the router has no
   * anchor-scrolling configuration).
   */
  protected backToSource(event: Event): void {
    event.preventDefault();

    if (this.fromCatalogue()) {
      void this.router.navigate(['/templates']);
      return;
    }

    void this.router.navigate(['/'], { fragment: 'templates' }).then(() => {
      if (typeof document === 'undefined') {
        return;
      }

      const scroll = (): void => {
        const target = document.getElementById('templates');

        if (!target) {
          return;
        }

        const prefersReducedMotion =
          typeof window.matchMedia === 'function' &&
          window.matchMedia(REDUCED_MOTION_QUERY).matches;

        target.scrollIntoView({
          behavior: prefersReducedMotion ? 'instant' : 'smooth',
          block: 'start'
        });
      };

      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(scroll);
      } else {
        scroll();
      }
    });
  }

  /**
   * Starts the existing website-creation workflow with the selected template.
   * Guests are sent to registration first. This does not create anything by
   * itself — CreateWebsite still requires restaurant details before calling
   * the real API.
   */
  protected useThisTemplate(): void {
    const tpl = this.template();

    if (!tpl) {
      return;
    }

    if (!this.isAuthenticated()) {
      void this.router.navigate(['/register']);
      return;
    }

    void this.router.navigate(['/websites', 'new'], {
      queryParams: { templateId: tpl.id }
    });
  }
}
