
import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import {
  catchError,
  finalize,
  map,
  Observable,
  of,
  switchMap,
  tap
} from 'rxjs';
import { AuthService } from './auth.service';
import type { AuthResult } from '../models/auth.model';

@Injectable({
  providedIn: 'root'
})
export class AuthStateService {
  private readonly authService = inject(AuthService);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly authResultState = signal<AuthResult | null>(null);
  private readonly initializedState = signal(false);

  readonly authResult = this.authResultState.asReadonly();
  readonly isInitialized = this.initializedState.asReadonly();

  readonly isAuthenticated = computed(
    () => this.authResultState() !== null
  );

  initializeSession(): Observable<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return of(undefined).pipe(
        tap(() => this.initializedState.set(true))
      );
    }

    return this.authService.getCurrentUser().pipe(
      map(response => {
        if (!response.success || !response.data) {
          throw new Error('Unable to restore the current user session.');
        }

        return response.data;
      }),
      catchError((error: unknown) => {
        if (
          error instanceof HttpErrorResponse &&
          error.status === 401
        ) {
          return this.authService.refresh().pipe(
            switchMap(response => {
              if (!response.success || !response.data) {
                return of(null);
              }

              return this.authService.getCurrentUser().pipe(
                map(currentUserResponse =>
                  currentUserResponse.success && currentUserResponse.data
                    ? currentUserResponse.data
                    : null
                ),
                catchError(() => of(null))
              );
            }),
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
