import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, finalize, map, Observable, of, tap } from 'rxjs';
import { AuthService } from './auth.service';
import type { AuthResult } from '../models/auth.model';

@Injectable({
  providedIn: 'root'
})
export class AuthStateService {
  private readonly authService = inject(AuthService);

  private readonly authResultState = signal<AuthResult | null>(null);
  private readonly initializedState = signal(false);

  readonly authResult = this.authResultState.asReadonly();
  readonly isInitialized = this.initializedState.asReadonly();

  readonly isAuthenticated = computed(
    () => this.authResultState() !== null
  );

  initializeSession(): Observable<void> {
    return this.authService.getCurrentUser().pipe(
      map(response => response.success ? response.data : null),
      catchError((error: unknown) => {
        if (
          error instanceof HttpErrorResponse &&
          error.status === 401
        ) {
          return this.authService.refresh().pipe(
            map(response => response.success ? response.data : null),
            catchError(() => of(null))
          );
        }

        return of(null);
      }),
      tap(result => this.authResultState.set(result)),
      map(() => undefined),
      finalize(() => this.initializedState.set(true))
    );
  }

  setAuthResult(result: AuthResult): void {
    this.authResultState.set(result);
    this.initializedState.set(true);
  }

  clearAuthState(): void {
    this.authResultState.set(null);
    this.initializedState.set(true);
  }
}