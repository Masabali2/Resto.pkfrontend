
import { Component, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { AuthStateService } from '../../../../core/services/auth-state.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { InlineError } from '../../../../shared/components/inline-error/inline-error/inline-error';
import type { ApiResponse } from '../../../../core/models/api-response.model';
import type { AuthResult, LoginRequest } from '../../../../core/models/auth.model';
import { HttpErrorHandlerService } from '../../../../core/services/http-error-handler.service';
import {Button} from "../../../../shared/components/button/button";
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
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly httpErrorHandler = inject(HttpErrorHandlerService);

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

          void this.router.navigateByUrl(this.getDashboardRoute(response.data), {
            replaceUrl: true
          });
        },
        error: (error: unknown) => {
          this.handleLoginError(error);
        }
      });
  }

private getDashboardRoute(result: AuthResult): string {
  const platformRoles = result.user.platformRoles ?? [];
  const tenantRole = result.activeTenant?.roleName;

  if (platformRoles.includes('PlatformAdmin')) {
    return '/platform/dashboard';
  }

  if (tenantRole === 'Owner') {
    return '/tenant/dashboard';
  }

  if (tenantRole === 'Manager') {
    return '/manager/dashboard';
  }

  if (tenantRole === 'Staff') {
    return '/staff/dashboard';
  }

  if (result.memberships.length > 0 && !result.activeTenant) {
    return '/select-restaurant';
  }

  return '/unauthorized';
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
