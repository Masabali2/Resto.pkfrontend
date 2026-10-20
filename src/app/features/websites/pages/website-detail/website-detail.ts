import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import { WebsiteService } from '../../services/website.service';
import { HttpErrorHandlerService } from '../../../../core/services/http-error-handler.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Button } from '../../../../shared/components/button/button';
import { LoadingSpinner } from '../../../../shared/components/loading-spinner/loading-spinner';
import type { ApiResponse } from '../../../../core/models/api-response.model';
import type { WebsiteDto } from '../../models/website.model';

type DetailState = 'loading' | 'ready' | 'missing' | 'error';
type PublishAction = 'idle' | 'publishing' | 'unpublishing';

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

/**
 * Management landing page for a single website, loaded through the verified
 * GET /api/v1/websites/{id} endpoint (backend enforces tenant ownership).
 * Full editing lives in later builder phases.
 */
@Component({
  selector: 'app-website-detail',
  standalone: true,
  imports: [DatePipe, RouterLink, Button, LoadingSpinner],
  templateUrl: './website-detail.html',
  styleUrl: './website-detail.css'
})
export class WebsiteDetail {
  private readonly websiteService = inject(WebsiteService);
  private readonly httpErrorHandler = inject(HttpErrorHandlerService);
  private readonly notificationService = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);
  protected readonly router = inject(Router);

  protected readonly state = signal<DetailState>('loading');
  protected readonly website = signal<WebsiteDto | null>(null);
  protected readonly errorMessage = signal('');
  protected readonly publishAction = signal<PublishAction>('idle');

  /** Only shown while the server reports the site as published. */
  protected readonly publicSiteUrl = computed(() => {
    const site = this.website();
    return site?.isPublished
      ? buildPublicSiteUrl(environment.publicSiteBaseUrl, site.slug)
      : null;
  });

  protected readonly canPublish = computed(() => {
    const site = this.website();
    return !!site && site.draftVersion != null && this.publishAction() === 'idle';
  });

  protected readonly publicationLabel = computed(() => {
    const site = this.website();

    if (!site) return '';

    if (site.isPublished) {
      return `Published${site.publishedVersion != null ? ` v${site.publishedVersion}` : ''}`;
    }

    return `${site.status}${site.draftVersion != null ? ` (draft v${site.draftVersion})` : ' (no draft yet)'}`;
  });

  constructor() {
    // Load once the route parameter is available.
    this.route.paramMap.subscribe(params => {
      const id = params.get('id') ?? '';

      if (!id) {
        this.state.set('missing');
        return;
      }

      this.load(id);
    });
  }

  protected load(websiteId?: string): void {
    const id = websiteId ?? this.route.snapshot.paramMap.get('id') ?? '';

    this.state.set('loading');
    this.errorMessage.set('');

    this.websiteService.getWebsite(id).subscribe({
      next: (response: ApiResponse<WebsiteDto>) => {
        if (!response.success || !response.data) {
          this.errorMessage.set(
            response.message ?? 'Unable to load this website. Please try again.'
          );
          this.state.set(response.errorCode === 'NOT_FOUND' ? 'missing' : 'error');
          return;
        }

        this.website.set(response.data);
        this.state.set('ready');
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
   * Publishes the last SAVED draft on the server (verified backend lifecycle:
   * POST api/v1/websites/{id}/publish). The editor's unsaved local edits are
   * never part of this request; the confirmation step states that explicitly.
   */
  protected publish(): void {
    const site = this.website();

    if (!site || !this.canPublish()) return;

    const confirmed = window.confirm(
      `Publish "${site.name}" at /${site.slug}? Visitors will see the last saved draft configuration.`
    );
    if (!confirmed) return;

    this.publishAction.set('publishing');

    this.websiteService.publish(site.id).subscribe({
      next: (response: ApiResponse<WebsiteDto>) => {
        this.publishAction.set('idle');

        if (response.success && response.data) {
          this.website.set(response.data);
          this.notificationService.success(
            `${response.data.name} is now live at /${response.data.slug}.`
          );
          return;
        }

        this.notificationService.error(
          response.message ?? 'Publication failed. Your published site is unchanged.'
        );
      },
      error: (error: unknown) => {
        this.publishAction.set('idle');
        this.notificationService.error(
          this.httpErrorHandler.handle(error, {
            fallbackMessage: 'Publication failed. Your published site is unchanged.'
          }).message
        );
      }
    });
  }

  /**
   * Unpublishes via POST api/v1/websites/{id}/unpublish. The website row,
   * draft configuration and previously published version data are kept by
   * the backend — only public visibility is removed.
   */
  protected unpublish(): void {
    const site = this.website();

    if (!site || this.publishAction() !== 'idle') return;

    const confirmed = window.confirm(
      `Unpublish "${site.name}"? The public site at /${site.slug} will become unavailable until it is published again. Your draft configuration will be kept.`
    );
    if (!confirmed) return;

    this.publishAction.set('unpublishing');

    this.websiteService.unpublish(site.id).subscribe({
      next: (response: ApiResponse<WebsiteDto>) => {
        this.publishAction.set('idle');

        if (response.success && response.data) {
          this.website.set(response.data);
          this.notificationService.success(
            'The website is no longer publicly visible. Its draft was kept.'
          );
          return;
        }

        this.notificationService.error(
          response.message ?? 'Unpublishing failed. The site is still live.'
        );
      },
      error: (error: unknown) => {
        this.publishAction.set('idle');
        this.notificationService.error(
          this.httpErrorHandler.handle(error, {
            fallbackMessage: 'Unpublishing failed. The site is still live.'
          }).message
        );
      }
    });
  }
}
