
import { Component, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize, take } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../../core/services/auth.service';
import { AuthStateService } from '../../../../core/services/auth-state.service';
import { AuthorizationService } from '../../../../core/services/authorization.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { InlineError } from '../../../../shared/components/inline-error/inline-error/inline-error';
import type { ApiResponse } from '../../../../core/models/api-response.model';
import type { AuthResult, LoginRequest } from '../../../../core/models/auth.model';
import { HttpErrorHandlerService } from '../../../../core/services/http-error-handler.service';
import {Button} from "../../../../shared/components/button/button";
import { ActiveRestaurantStateService } from '../../../../core/services/active-restaurant-state.service';
import type { ActiveRestaurantState } from '../../../../core/models/active-restaurant.model';
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, InlineError , Button],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly authState = inject(AuthStateService);
  private readonly authorization = inject(AuthorizationService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly httpErrorHandler = inject(HttpErrorHandlerService);
  private readonly activeRestaurantState = inject(ActiveRestaurantStateService);

  readonly form = this.fb.nonNullable.group({
    emailOrUserName: ['', Validators.required],
    password: ['', Validators.required],
    rememberMe: [false]
  });

  loading = false;
  passwordVisible = false;
  submitted = false;
  generalError = '';
  fieldErrors: Record<string, string> = {};

  /** Template id carried through the authentication flow, when present. */
  protected readonly templateId = this.route.snapshot.queryParamMap.get('templateId') ?? null;

  togglePasswordVisibility(): void {
    this.passwordVisible = !this.passwordVisible;
  }

  submit(): void {
    this.submitted = true;
    this.generalError = '';
    this.fieldErrors = {};

    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      return;
    }

    const request: LoginRequest = {
      emailOrUserName: this.form.controls.emailOrUserName.value.trim(),
      password: this.form.controls.password.value
    };

    this.loading = true;

    this.authService.login(request)
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (response: ApiResponse<AuthResult>) => {
          if (!response.success || !response.data) {
            const message =
              response.message ?? 'Unable to sign in. Please try again.';

            this.generalError = message;
            this.notificationService.error(message);
            return;
          }

          this.authState.setAuthResult(response.data);

          const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');

          if (returnUrl && this.isSafeReturnUrl(returnUrl)) {
            void this.router.navigateByUrl(returnUrl, { replaceUrl: true });
          } else if (this.templateId) {
            void this.resolveAndNavigate(this.templateId);
          } else {
            void this.router.navigateByUrl(this.getDashboardRoute(response.data), {
              replaceUrl: true
            });
          }
        },
        error: (error: unknown) => {
          this.handleLoginError(error);
        }
      });
  }

private getDashboardRoute(_result: AuthResult): string {
  return '/dashboard';
}

  /**
   * Resolves the signed-in user's onboarding state and navigates to the next
   * required step, always carrying the selected template id.
   */
  private resolveAndNavigate(templateId: string): void {
    const tenantId = this.authorization.activeTenantId();

    if (!tenantId) {
      void this.router.navigate(['/setup', 'workspace'], {
        queryParams: { templateId }
      });
      return;
    }

    const state = this.activeRestaurantState.state();

    if (state === 'loading' || state === 'idle') {
      toObservable(this.activeRestaurantState.state)
        .pipe(take(1))
        .subscribe(nextState => {
          this.afterRestaurantResolved(nextState as ActiveRestaurantState, templateId);
        });
      return;
    }

    this.afterRestaurantResolved(state, templateId);
  }

  private afterRestaurantResolved(state: ActiveRestaurantState, templateId: string): void {
    if (state === 'resolved' && this.activeRestaurantState.hasRestaurant()) {
      void this.router.navigate(['/websites', 'new'], {
        queryParams: { templateId }
      });
      return;
    }

    if (state === 'empty') {
      void this.router.navigate(['/setup', 'restaurant'], {
        queryParams: { templateId }
      });
      return;
    }

    // Error or forbidden: restaurant setup is the safe next step.
    void this.router.navigate(['/setup', 'restaurant'], {
      queryParams: { templateId }
    });
  }

  /**
   * Validates that a return URL is a same-origin, root-relative path to prevent
   * open redirects. Only internal routes are accepted.
   */
  private isSafeReturnUrl(url: string): boolean {
    if (!url || typeof url !== 'string') {
      return false;
    }

    try {
      const parsed = new URL(url, window.location.origin);
      return parsed.origin === window.location.origin && parsed.pathname.startsWith('/');
    } catch {
      return false;
    }
  }

  private handleLoginError(error: unknown): void {
  const result = this.httpErrorHandler.handle(error, {
    unauthorizedMessage:
      'Invalid email/username or password. Please try again.',
    fallbackMessage: 'Unable to sign in. Please try again.',
    fieldAliases: {
      email: 'emailOrUserName',
      username: 'emailOrUserName',
      emailorusername: 'emailOrUserName'
    }
  });

  this.generalError = result.message;
  this.fieldErrors = result.fieldErrors;

  if (result.message) {
    this.notificationService.error(result.message);
  }
}

  private showGeneralError(message: string): void {
    this.generalError = message;
    this.notificationService.error(message);
  }

  private normalizeFieldKey(key: string): string | null {
    const normalized = key.replace(/[\s_-]/g, '').toLowerCase();

    if (
      normalized === 'emailorusername' ||
      normalized === 'email' ||
      normalized === 'username'
    ) {
      return 'emailOrUserName';
    }

    if (normalized === 'password') {
      return 'password';
    }

    return null;
  }
  showFieldError(
  field: 'emailOrUserName' | 'password'
): boolean {
  const control = this.form.controls[field];

  return (control.touched || this.submitted) &&
    (control.invalid || !!this.fieldErrors[field]);
}

getFieldError(
  field: 'emailOrUserName' | 'password'
): string | null {
  const control = this.form.controls[field];

  if (!(control.touched || this.submitted)) {
    return null;
  }

  if (control.hasError('required')) {
    return field === 'emailOrUserName'
      ? 'Email or username is required.'
      : 'Password is required.';
  }

  return this.fieldErrors[field] || null;
}
}
