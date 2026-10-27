import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  signal,
  viewChild
} from '@angular/core';
import { Router } from '@angular/router';
import { WebsiteService } from '../../../websites/services/website.service';
import { HttpErrorHandlerService } from '../../../../core/services/http-error-handler.service';
import { Button } from '../../../../shared/components/button/button';
import { TemplateRenderer } from '../../../websites/components/template-renderer/template-renderer';
import type { ApiResponse } from '../../../../core/models/api-response.model';
import type { PublicWebsiteTemplateDto } from '../../../websites/models/website-template.model';
import type { WebsiteTemplateCatalogueItem } from '../../../websites/models/website-template-catalogue.model';
import { buildCatalogueItem } from '../../../websites/utils/website-template-catalogue.util';

/** The marketing showcase intentionally features the first four catalogue entries. */
const SHOWCASE_LIMIT = 4;

/**
 * Public-website template showcase.
 *
 * Displays up to four templates from the ANONYMOUS public catalogue
 * (`GET api/v1/public/website-templates`), ordered by the display order
 * declared inside each template's validated design configuration (then name).
 * Each card is a real thumbnail rendered from the template's own design
 * configuration; "Preview" opens the dedicated full-page preview and
 * "Use Template" starts the existing sign-up flow.
 */
@Component({
  selector: 'app-template-showcase',
  standalone: true,
  imports: [Button, TemplateRenderer],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './template-showcase.html',
  styleUrl: './template-showcase.css'
})
export class TemplateShowcase implements AfterViewInit {
  private readonly router = inject(Router);
  private readonly websiteService = inject(WebsiteService);
  private readonly httpErrorHandler = inject(HttpErrorHandlerService);

  protected readonly templates = signal<
    WebsiteTemplateCatalogueItem<PublicWebsiteTemplateDto>[]
  >([]);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');

  /**
   * Entrance-reveal state for the card grid. The SSR-prerendered page always
   * shows fully visible cards; in interactive hydrating browsers a one-shot
   * IntersectionObserver (set up in ngAfterViewInit, browser only) hides the
   * cards and reveals them with a staggered fade-up when the section scrolls
   * into view. If JS never runs, cards simply remain visible.
   */
  protected readonly revealState = signal<'idle' | 'pending' | 'revealed'>('idle');

  private readonly gridRef = viewChild<ElementRef<HTMLDivElement>>('templateGrid');

  private loadingInFlight = false;

  constructor() {
    this.loadTemplates();
  }

  protected loadTemplates(): void {
    if (this.loadingInFlight) {
      return;
    }

    this.loadingInFlight = true;
    this.loading.set(true);
    this.errorMessage.set('');

    this.websiteService.getPublicTemplates().subscribe({
      next: (response: ApiResponse<PublicWebsiteTemplateDto[]>) => {
        this.loadingInFlight = false;

        if (!response.success || !response.data) {
          this.errorMessage.set(
            response.message ?? 'Unable to load templates. Please try again.'
          );
          this.loading.set(false);
          return;
        }

        const items = response.data
          .map(template => buildCatalogueItem(template))
          .sort(
            (left, right) =>
              left.displayOrder - right.displayOrder ||
              left.template.name.localeCompare(right.template.name)
          )
          .slice(0, SHOWCASE_LIMIT);

        this.templates.set(items);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loadingInFlight = false;

        // The public catalogue is anonymous, so a 401/403 is never an expected
        // state: it means the request reached a different/protected endpoint or
        // an interceptor changed it. Surface it as a normal load failure with a
        // retry instead of asking the visitor to sign in.
        this.errorMessage.set(
          this.httpErrorHandler.handle(error, {
            fallbackMessage: 'Unable to load templates. Please try again.'
          }).message
        );
        this.loading.set(false);
      }
    });
  }

  ngAfterViewInit(): void {
    // SSR guard: browser globals are only touched when a real window exists.
    if (typeof IntersectionObserver !== 'function') return;

    const grid = this.gridRef()?.nativeElement;
    if (!grid) return;

    this.revealState.set('pending');
    const observer = new IntersectionObserver(
      (entries: IntersectionObserverEntry[]) => {
        if (entries.some(entry => entry.isIntersecting)) {
          this.revealState.set('revealed');
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(grid);
  }

  /** Opens the dedicated preview page for the real catalogue template id. */
  protected openPreview(templateId: string): void {
    void this.router.navigate(['/templates', templateId, 'preview']);
  }

  /** "Use Template" starts account sign-up, as before. */
  protected useTemplate(): void {
    void this.router.navigate(['/register']);
  }
}
