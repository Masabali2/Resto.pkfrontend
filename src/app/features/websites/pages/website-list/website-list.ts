import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { WebsiteService } from '../../services/website.service';
import { HttpErrorHandlerService } from '../../../../core/services/http-error-handler.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Button } from '../../../../shared/components/button/button';
import { LoadingSpinner } from '../../../../shared/components/loading-spinner/loading-spinner';
import type { ApiResponse } from '../../../../core/models/api-response.model';
import type { WebsiteDto, WebsitesPage } from '../../models/website.model';

@Component({
  selector: 'app-website-list',
  standalone: true,
  imports: [DatePipe, RouterLink, Button, LoadingSpinner],
  templateUrl: './website-list.html',
  styleUrl: './website-list.css'
})
export class WebsiteList {
  private readonly websiteService = inject(WebsiteService);
  private readonly notificationService = inject(NotificationService);
  private readonly httpErrorHandler = inject(HttpErrorHandlerService);

  protected readonly websites = signal<WebsiteDto[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly loading = signal(true);
  protected readonly loadError = signal('');

  constructor() {
    this.loadWebsites();
  }

  protected loadWebsites(): void {
    if (this.loading()) return;

    this.loading.set(true);
    this.loadError.set('');

    this.websiteService.getWebsites()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response: ApiResponse<WebsitesPage>) => {
          if (!response.success || !response.data) {
            const message =
              response.message ?? 'Unable to load your websites. Please try again.';

            this.loadError.set(message);
            this.notificationService.error(message);
            return;
          }

          this.websites.set(response.data.items);
          this.totalCount.set(response.data.totalCount);
        },
        error: (error: unknown) => {
          const message =
            this.httpErrorHandler.extractBackendMessage(error) ??
            'Unable to load your websites. Please try again.';

          this.loadError.set(message);
          this.notificationService.error(message);
        }
      });
  }

  protected retry(): void {
    this.loadWebsites();
  }

  protected publicationLabel(website: WebsiteDto): string {
    if (website.isPublished) {
      return `Published${website.publishedVersion != null ? ` v${website.publishedVersion}` : ''}`;
    }

    return `Draft${website.draftVersion != null ? ` v${website.draftVersion}` : ''}`;
  }
}
