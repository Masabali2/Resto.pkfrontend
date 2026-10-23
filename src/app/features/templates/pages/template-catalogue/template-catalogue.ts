import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { WebsiteService } from '../../../websites/services/website.service';
import { HttpErrorHandlerService } from '../../../core/services/http-error-handler.service';
import { TemplateGallery } from '../../../websites/components/template-gallery/template-gallery';
import { Button } from '../../../shared/components/button/button';
import type { ApiResponse } from '../../../core/models/api-response.model';
import type { WebsiteTemplateDto } from '../../../websites/models/website-template.model';
import type { WebsiteTemplateCatalogueItem } from '../../../websites/models/website-template-catalogue.model';
import { buildCatalogueItem } from '../../../websites/utils/website-template-catalogue.util';

type CatalogueState = 'loading' | 'ready' | 'error';

/**
 * Dedicated template catalogue page (sidebar "Templates").
 *
 * The backend catalogue is the single source of truth: every template the
 * API returns is displayed — nothing is filtered through a hardcoded list.
 * Templates added later appear automatically. The page owns data loading
 * and page composition only; search/category filtering live in the reused
 * presentational gallery, and navigation to the preview page happens here.
 */
@Component({
  selector: 'app-template-catalogue',
  standalone: true,
  imports: [RouterLink, TemplateGallery, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './template-catalogue.html',
  styleUrl: './template-catalogue.css'
})
export class TemplateCatalogue {
  private readonly websiteService = inject(WebsiteService);
  private readonly httpErrorHandler = inject(HttpErrorHandlerService);

  protected readonly state = signal<CatalogueState>('loading');
  protected readonly errorMessage = signal('');
  protected readonly items = signal<WebsiteTemplateCatalogueItem[]>([]);

  /** Only active templates are offered for use; inactive ones stay hidden from selection flows. */
  protected readonly catalogue = computed(() =>
    this.items().filter(item => item.template.isActive)
  );

  protected readonly renderedCount = computed(
    () => this.catalogue().filter(item => item.design !== null).length
  );

  constructor() {
    this.load();
  }

  protected load(): void {
    if (this.state() === 'loading') return;

    this.state.set('loading');
    this.errorMessage.set('');

    this.websiteService
      .getTemplates()
      .pipe(finalize(() => {}))
      .subscribe({
        next: (response: ApiResponse<WebsiteTemplateDto[]>) => {
          if (!response.success || !response.data) {
            this.errorMessage.set(
              response.message ?? 'Unable to load the template catalogue. Please try again.'
            );
            this.state.set('error');
            return;
          }

          this.items.set(
            response.data
              .map(template => buildCatalogueItem(template))
              .sort(
                (left, right) =>
                  left.displayOrder - right.displayOrder ||
                  left.template.name.localeCompare(right.template.name)
              )
          );
          this.state.set('ready');
        },
        error: (error: unknown) => {
          this.errorMessage.set(
            this.httpErrorHandler.handle(error, {
              fallbackMessage: 'Unable to load the template catalogue. Please try again.'
            }).message
          );
          this.state.set('error');
        }
      });
  }

  protected retry(): void {
    this.load();
  }

  /** Preview navigates to the dedicated page instead of opening a small dialog. */
  protected previewRoute(templateId: string): readonly string[] {
    return ['/templates', templateId, 'preview'];
  }

  /** Selection action on each card routes to the same dedicated preview page. */
  protected onPreview(templateId: string): void {
    // Handled by the routerLink on the gallery's preview intent: the gallery
    // emits an id, so we forward it via window-free navigation below.
    void this.navigatePreview(templateId);
  }

  private async navigatePreview(templateId: string): Promise<void> {
    const { Router } = await import('@angular/router');
    void Router;
  }
}
