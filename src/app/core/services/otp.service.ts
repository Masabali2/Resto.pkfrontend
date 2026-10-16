import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { ApiResponse } from '../models/api-response.model';
import type {
  SendEmailVerificationOtpRequest,
  VerifyEmailOtpRequest
} from '../models/otp.model';

@Injectable({
  providedIn: 'root'
})
export class OtpService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/Auth`;

  verifyOtp(
    request: VerifyEmailOtpRequest
  ): Observable<ApiResponse<string>> {
    return this.http.post<ApiResponse<string>>(
      `${this.apiUrl}/verify-otp`,
      request
    );
  }

  resendOtp(
    request: SendEmailVerificationOtpRequest
  ): Observable<ApiResponse<string>> {
    return this.http.post<ApiResponse<string>>(
      `${this.apiUrl}/resend-otp`,
      request
    );
  }
}
