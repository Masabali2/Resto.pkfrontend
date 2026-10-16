import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { ApiResponse } from '../models/api-response.model';
import type {
  ForgotPasswordRequest,
  ResetPasswordRequest
} from '../models/password-recovery.model';

@Injectable({
  providedIn: 'root'
})
export class PasswordRecoveryService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/Auth`;

  forgotPassword(
    request: ForgotPasswordRequest
  ): Observable<ApiResponse<string>> {
    return this.http.post<ApiResponse<string>>(
      `${this.apiUrl}/ForgotPassword`,
      request
    );
  }

  resetPassword(
    request: ResetPasswordRequest
  ): Observable<ApiResponse<string>> {
    return this.http.post<ApiResponse<string>>(
      `${this.apiUrl}/ResetPassword`,
      request
    );
  }
}
