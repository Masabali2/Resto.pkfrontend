import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type { ApiResponse } from '../../../core/models/api-response.model';
import type { WebsiteDraftDto } from '../models/website-draft.model';
import type { WebsiteTemplateDto } from '../models/website-template.model';
import type {
  CreateWebsiteRequest,
  SaveWebsiteDraftRequest,
  WebsiteDto,
  WebsitesPage
} from '../models/website.model';

@Injectable({
  providedIn: 'root'
})
export class WebsiteService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/v1/websites`;

  getTemplates(): Observable<ApiResponse<WebsiteTemplateDto[]>> {
    return this.http.get<ApiResponse<WebsiteTemplateDto[]>>(
      `${this.apiUrl}/templates`
    );
  }

  getWebsites(page = 1, pageSize = 20): Observable<ApiResponse<WebsitesPage>> {
    const params = new HttpParams()
      .set('page', page)
      .set('pageSize', pageSize);

    return this.http.get<ApiResponse<WebsitesPage>>(
      this.apiUrl,
      { params }
    );
  }

  /** Verified against backend WebsitesController: GET api/v1/websites/{id}. */
  getWebsite(websiteId: string): Observable<ApiResponse<WebsiteDto>> {
    return this.http.get<ApiResponse<WebsiteDto>>(
      `${this.apiUrl}/${websiteId}`
    );
  }

  createWebsite(request: CreateWebsiteRequest): Observable<ApiResponse<WebsiteDto>> {
    return this.http.post<ApiResponse<WebsiteDto>>(
      this.apiUrl,
      request
    );
  }

  /**
   * Saves the website draft configuration. The backend validates
   * `configurationJson` against its WebsiteConfigSchema before persisting.
   * Verified: PUT api/v1/websites/{id}/draft returns ApiResponse<WebsiteDto>.
   */
  saveDraft(websiteId: string, request: SaveWebsiteDraftRequest): Observable<ApiResponse<WebsiteDto>> {
    return this.http.put<ApiResponse<WebsiteDto>>(
      `${this.apiUrl}/${websiteId}/draft`,
      request
    );
  }

  /**
   * Verified against backend WebsitesController: POST api/v1/websites/{id}/publish.
   * Freezes the current draft into an immutable published version inside one
   * transaction; returns updated website metadata (isPublished, publishedAt,
   * publishedVersion) inside the standard ApiResponse envelope. Requires the
   * Website.Publish permission and an active tenant — enforced server-side.
   */
  publish(websiteId: string): Observable<ApiResponse<WebsiteDto>> {
    return this.http.post<ApiResponse<WebsiteDto>>(
      `${this.apiUrl}/${websiteId}/publish`,
      {}
    );
  }

  /**
   * Verified against backend WebsitesController: POST api/v1/websites/{id}/unpublish.
   * Makes the public site unavailable; keeps the website row, its draft
   * configuration and any previously published version data intact.
   */
  unpublish(websiteId: string): Observable<ApiResponse<WebsiteDto>> {
    return this.http.post<ApiResponse<WebsiteDto>>(
      `${this.apiUrl}/${websiteId}/unpublish`,
      {}
    );
  }

  /**
   * Reads the tenant's saved DRAFT configuration for editing. Implemented on
   * the backend (WebsitesController.GetDraft): success with hasDraft=false
   * means no draft exists yet; published content is never returned here.
   * Requires Website.View + ownership — enforced server-side.
   */
  getDraft(websiteId: string): Observable<ApiResponse<WebsiteDraftDto>> {
    return this.http.get<ApiResponse<WebsiteDraftDto>>(
      `${this.apiUrl}/${websiteId}/draft`
    );
  }
}
