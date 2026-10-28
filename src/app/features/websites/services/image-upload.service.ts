import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import type { ApiResponse } from '../../../core/models/api-response.model';
import type {
  AssetUploadResult,
  UploadDestination,
  UploadImageRequest
} from '../models/image-upload.model';

/**
 * Context-aware image upload API. The destination (not a user-chosen role)
 * determines how the file is associated. Tenant id is never sent by the
 * client — it is resolved server-side from the authenticated session via the
 * X-Tenant-Id header (set by TenantInterceptor).
 */
@Injectable({
  providedIn: 'root'
})
export class ImageUploadService {
  private readonly http = inject(HttpClient);
  private readonly uploadUrl = `${environment.apiUrl}/v1/assets/upload`;

  /**
   * Uploads a single image to an authorized destination.
   * Returns the stable asset id and preview information required by the UI.
   */
  upload(request: UploadImageRequest): Observable<AssetUploadResult> {
    const formData = new FormData();
    formData.append('file', request.file, request.file.name);
    formData.append('destination', JSON.stringify(request.destination));

    return this.http.post<ApiResponse<AssetUploadResult>>(this.uploadUrl, formData).pipe(
      map(response => {
        if (!response.success || !response.data) {
          throw new Error(response.message ?? 'The image could not be uploaded.');
        }
        return response.data;
      }),
      catchError(error => {
        const backendMessage = error instanceof HttpErrorResponse
          ? (error.error as { message?: string } | null)?.message
          : undefined;
        throw new Error(backendMessage ?? 'The image could not be uploaded. Please try again.');
      })
    );
  }
}
