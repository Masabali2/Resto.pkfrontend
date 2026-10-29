import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { WebsiteService } from '../../websites/services/website.service';
import type { ApiResponse } from '../../../core/models/api-response.model';
import type {
  BrandingAsset,
  BrandingAssetType,
  StorageInfo,
  WebsiteBrandingSettings
} from '../models/branding-assets.models';

/**
 * API transport for the Branding & Assets feature.
 *
 * All calls target the restaurant-asset architecture
 * (RestaurantAssetsController): upload, list, replace and delete are scoped
 * to the active tenant's restaurant and use the restaurant asset ID
 * consistently across endpoints. The website draft endpoint persists the
 * branding configuration document.
 *
 * Verified contracts (backend repository RestaurantSaaS, branch newfeaturebranch):
 *   POST restaurants/{restaurantId}/assets/{assetType}  upload/replace
 *   GET  restaurants/{restaurantId}/assets               list
 *   DELETE restaurants/{restaurantId}/assets/{assetId}   delete (409 ASSET_STILL_REFERENCED)
 *   GET  restaurants/{restaurantId}/storage              storage usage ({usedBytes, quotaBytes|null})
 *   GET/PUT  v1/websites/{id}/draft                      website configuration
 */
const API_URL = environment.apiUrl;
const API_ORIGIN = new URL(API_URL).origin;

type RestaurantAssetDto = {
  id: string;
  assetType: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  fileId: string;
  createdAt: string;
  updatedAt: string;
  url: string;
};

@Injectable({
  providedIn: 'root'
})
export class BrandingAssetsService {
  private readonly http = inject(HttpClient);
  private readonly websiteService = inject(WebsiteService);

  private readonly assetsUrl = (restaurantId: string) =>
    `${API_URL}/restaurants/${restaurantId}/assets`;

  private readonly storageUrl = (restaurantId: string) =>
    `${API_URL}/restaurants/${restaurantId}/storage`;

  /**
   * Resolves a backend delivery URL to an absolute, cross-origin usable URL.
   * Backend presigned/storage URLs are relative (/api/v1/files/{key}); the
   * Angular dev server runs on a different port, so the API origin must be
   * prefixed for images to load.
   */
  private assetUrl(relativeOrAbsolute: string | null): string | null {
    if (!relativeOrAbsolute) return null;
    if (/^https?:\/\//i.test(relativeOrAbsolute)) return relativeOrAbsolute;
    return API_ORIGIN + relativeOrAbsolute;
  }

  /**
   * Uploads a single image asset for the active tenant's restaurant.
   * The asset type is bound server-side via the route (never trusted from the
   * client beyond the allowed enum). Replaces any existing active asset of the
   * same type; the previous file is only removed after the replacement
   * succeeds.
   */
  uploadAsset(
    file: File,
    restaurantId: string,
    assetType: BrandingAssetType
  ): Observable<BrandingAsset> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http
      .post<ApiResponse<{ id: string; assetType: string; fileName: string; contentType: string; fileSize: number; createdAt: string; updatedAt: string; url: string; fileId: string }>>(
        `${this.assetsUrl(restaurantId)}/${assetType}`,
        formData
      )
      .pipe(
        map(response => {
          if (!response.success || !response.data) {
            throw new Error(response.message ?? 'The asset could not be uploaded.');
          }
          const dto = response.data;
          return {
            id: dto.id,
            assetType: dto.assetType as BrandingAssetType,
            fileName: dto.fileName,
            contentType: dto.contentType,
            fileSize: dto.fileSize,
            storageKey: dto.fileId,
            previewUrl: this.assetUrl(dto.url),
            created: dto.createdAt,
            isReferenced: false
          } as BrandingAsset;
        }),
        catchError(error => {
          const backendMessage = this.extractBackendMessage(error);
          throw new Error(backendMessage ?? 'The asset could not be uploaded.');
        })
      );
  }

  /**
   * Loads the branding assets of a restaurant.
   */
  loadAssets(restaurantId: string): Observable<BrandingAsset[]> {
    return this.http
      .get<ApiResponse<RestaurantAssetDto[]>>(this.assetsUrl(restaurantId))
      .pipe(
        map(response => {
          if (!response.success || !response.data) {
            throw new Error(response.message ?? 'The branding assets could not be loaded.');
          }
          return response.data.map(dto => ({
            id: dto.id,
            assetType: dto.assetType as BrandingAssetType,
            fileName: dto.fileName,
            contentType: dto.contentType,
            fileSize: dto.fileSize,
            storageKey: dto.fileId,
            previewUrl: this.assetUrl(dto.url),
            created: dto.createdAt,
            isReferenced: false
          }));
        }),
        catchError(error => {
          const backendMessage = this.extractBackendMessage(error);
          throw new Error(backendMessage ?? 'The branding assets could not be loaded.');
        })
      );
  }

  /**
   * Deletes an asset. Throws AssetReferencedError when the backend reports a
   * 409 conflict (asset still referenced by a website configuration).
   */
  deleteAsset(restaurantId: string, assetId: string): Observable<void> {
    return this.http
      .delete<ApiResponse<unknown>>(
        `${this.assetsUrl(restaurantId)}/${assetId}`
      )
      .pipe(
        map(() => undefined),
        catchError(error => {
          if (error instanceof HttpErrorResponse && error.status === 409) {
            const backendMessage = this.extractBackendMessage(error);
            throw new AssetReferencedError(
              backendMessage ?? 'This asset is still referenced and cannot be deleted.'
            );
          }
          const backendMessage = this.extractBackendMessage(error);
          throw new Error(backendMessage ?? 'The asset could not be deleted.');
        })
      );
  }

  /**
   * Reads storage usage and quota for a restaurant.
   * Quota is null when no authoritative storage quota policy is configured;
   * the UI must not fabricate a limit.
   */
  getStorageInfo(restaurantId: string): Observable<StorageInfo | null> {
    return this.http
      .get<ApiResponse<StorageInfo>>(this.storageUrl(restaurantId))
      .pipe(
        map(response => {
          if (!response.success || !response.data) {
            return null;
          }
          return response.data;
        }),
        catchError(() => of(null))
      );
  }

  /**
   * Persists branding theme, typography, hero layout and asset references
   * through the existing website draft endpoint, mapped to the backend
   * WebsiteConfigSchema structure (theme.colors, theme.font, settings.*).
   * Asset files are uploaded immediately via uploadAsset(); only the
   * configuration document is saved here.
   */
  saveConfiguration(
    websiteId: string,
    settings: WebsiteBrandingSettings
  ): Observable<unknown> {
    const configurationJson = JSON.stringify({
      schemaVersion: 1,
      theme: {
        colors: {
          primary: settings.theme?.primary ?? '',
          secondary: settings.theme?.secondary ?? '',
          tint: settings.theme?.tint ?? ''
        },
        font: settings.typography?.headingFont ?? ''
      },
      settings: {
        typography: {
          headingFont: settings.typography?.headingFont ?? '',
          bodyFont: settings.typography?.bodyFont ?? '',
          fontScale: settings.typography?.fontScale ?? 100
        },
        heroLayout: settings.heroLayout ?? '',
        assets: settings.assets ?? {}
      }
    });
    return this.websiteService.saveDraft(websiteId, { configurationJson });
  }

  private extractBackendMessage(error: unknown): string | undefined {
    if (error instanceof HttpErrorResponse) {
      return (error.error as { message?: string; errorCode?: string } | null)
        ?.message;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return undefined;
  }
}

/**
 * Thrown when a DELETE request fails with 409 because the asset is still
 * referenced by an active website configuration.
 */
export class AssetReferencedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssetReferencedError';
  }
}
