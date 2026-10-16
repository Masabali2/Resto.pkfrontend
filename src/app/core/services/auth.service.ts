
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { ApiResponse } from '../models/api-response.model';
import type {
  AuthResult,
  LoginRequest
} from '../models/auth.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/Auth`;

  login(request: LoginRequest): Observable<ApiResponse<AuthResult>> {
    return this.http.post<ApiResponse<AuthResult>>(
      `${this.apiUrl}/login`,
      request
    );
  }

  getCurrentUser(): Observable<ApiResponse<AuthResult>> {
    return this.http.get<ApiResponse<AuthResult>>(
      `${this.apiUrl}/me`
    );
  }

  refresh(): Observable<ApiResponse<AuthResult>> {
    return this.http.post<ApiResponse<AuthResult>>(
      `${this.apiUrl}/refresh`,
      {}
    );
  }

  logout(): Observable<void> {
    return this.http.post<void>(
      `${this.apiUrl}/logout`,
      {}
    );
  }
}
