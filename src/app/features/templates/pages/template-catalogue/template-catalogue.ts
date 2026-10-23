import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { WebsiteService } from '../../../websites/services/website.service';
import { HttpErrorHandlerService } from '../../../../core/services/http-error-handler.service';
import { TemplateGallery } from '../../../websites/components/template-gallery/template-gallery';
import { Button } from '../../../../shared/components/button/button';
import type { ApiResponse } from '../../../../core/models/api-response.model';
import type { WebsiteTemplateDto } from '../../../websites/models/website-template.model';
import type { WebsiteTemplateCatalogueItem } from '../../../websites/models/website-template-catalogue.model';
import { buildCatalogueItem } from '../../../websites/utils/website-template-catalogue.util';

type CatalogueState = 'loading' | 'ready' | 'error';

/**
 * Dedicated template catalogue page — the destination of the sidebar
 * "Templates" item.
 *
 * The backend catalogue is the single source of truth: every template the
 * API returns is displayed and nothing is filtered through a hardcoded
 * frontend list, so templates added later appear automatically. Each entry
 * is prepared once with `buildCatalogueItem` (the typed design parser), and
 * Preview navigates to the dedicated preview page instead of opening a
 * small dialog. Search and category filtering are provided by the reused
 * presentational gallery component.
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
  private readonly router = inject(Router);

  protected readonly state = signal<CatalogueState>('loading');
  protected readonly errorMessage = signal('');
  protected readonly items = signal<WebsiteTemplateCatalogueItem[]>([]);

  /** Only active templates are offered; inactive catalogue rows stay out of selection flows. */
  protected readonly catalogue = computed(() =>
    this.items().filter(item => item.template.isActive)
  );

  protected readonly renderableCount = computed(
    () => this.catalogue().filter(item => item.design !== null).length
  );

  constructor() {
    this.load();
  }

  protected load(): void {
    if (this.state() === 'loading') return;

    this.state.set('loading');
    this.errorMessage.set('');

    this.websiteService.getTemplates().subscribe({
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

  /** Opens the dedicated preview page for a real catalogue template id. */
  protected openPreview(templateId: string): void {
    void this.router.navigate(['/templates', templateId, 'preview']);
  }
}
