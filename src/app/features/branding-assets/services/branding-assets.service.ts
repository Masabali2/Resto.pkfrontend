import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { ImageUploadService } from '../../websites/services/image-upload.service';
import { WebsiteService } from '../../websites/services/website.service';
import type { ApiResponse } from '../../../core/models/api-response.model';
import type {
  AssetUploadResult,
  UploadDestination
} from '../../websites/models/image-upload.model';
import type {
  BrandingAsset,
  BrandingAssetType,
  BrandingConfiguration,
  StorageInfo,
  WebsiteBrandingSettings
} from '../models/branding-assets.models';

/**
 * API transport for the Branding & Assets feature.
 *
 * Verified existing contracts (implemented in this repository):
 *   POST v1/assets/upload              -> ImageUploadService (multipart)
 *   PUT   v1/websites/{id}/draft       -> WebsiteService.saveDraft
 *
 * Contracts assumed from the reference design (backend repository is not
 * part of this workspace; validate against the actual backend):
 *   GET  restaurants/{restaurantId}/assets
 *   DELETE v1/assets/{id}              (returns 409 ASSET_STILL_REFERENCED when referenced)
 *   GET  restaurants/{restaurantId}/storage
 */

const API_URL = environment.apiUrl;

@Injectable({
  providedIn: 'root'
})
export class BrandingAssetsService {
  private readonly http = inject(HttpClient);
  private readonly uploadService = inject(ImageUploadService);
  private readonly websiteService = inject(WebsiteService);

  private readonly assetsUrl = (restaurantId: string) =>
    `${API_URL}/restaurants/${restaurantId}/assets`;

  private readonly storageUrl = (restaurantId: string) =>
    `${API_URL}/restaurants/${restaurantId}/storage`;

  private readonly deleteUrl = (assetId: string) => `${API_URL}/v1/assets/${assetId}`;

  /**
   * Uploads a single image asset for the active tenant.
   * The destination kind is `restaurant-logo` so the backend resolves the
   * tenant/restaurant association server-side (never sent by the client).
   * `assetType` binds the file to a branding enum (Logo, DarkLogo, ...).
   */
  uploadAsset(
    file: File,
    restaurantId: string,
    assetType: BrandingAssetType
  ): Observable<AssetUploadResult> {
    const destination: UploadDestination = {
      kind: 'restaurant-logo',
      restaurantId
    };

    return this.uploadService.upload({ file, destination, assetType });
  }

  /**
   * Loads the branding assets of a restaurant.
   */
  loadAssets(restaurantId: string): Observable<BrandingAsset[]> {
    return this.http
      .get<ApiResponse<BrandingAsset[]>>(this.assetsUrl(restaurantId))
      .pipe(
        map(response => {
          if (!response.success || !response.data) {
            throw new Error(response.message ?? 'The branding assets could not be loaded.');
          }
          return response.data;
        }),
        catchError(error => {
          const backendMessage = this.extractBackendMessage(error);
          throw new Error(backendMessage ?? 'The branding assets could not be loaded.');
        })
      );
  }

  /**
   * Deletes an asset. Throws when the backend reports a 409 conflict
   * (asset still referenced by menu items or public banners).
   */
  deleteAsset(assetId: string): Observable<void> {
    return this.http
      .delete<ApiResponse<unknown>>(this.deleteUrl(assetId))
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
   * Falls back to a not-available result when the backend does not expose
   * storage metadata, so the UI can still render usage computed from assets.
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
   * Persists branding theme, typography and hero layout through the existing
   * website draft endpoint. Asset files are uploaded immediately via
   * uploadAsset(); only the configuration document is saved here.
   */
  saveConfiguration(
    websiteId: string,
    settings: WebsiteBrandingSettings
  ): Observable<unknown> {
    const configurationJson = JSON.stringify(settings);
    return this.websiteService.saveDraft(websiteId, {
      configurationJson
    });
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
 * referenced by active menu items or public banners.
 */
export class AssetReferencedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssetReferencedError';
  }
}
