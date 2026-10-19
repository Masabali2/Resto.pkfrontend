import { Component, inject, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { PasswordRecoveryService } from '../../../../core/services/password-recovery.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { HttpErrorHandlerService } from '../../../../core/services/http-error-handler.service';
import { InlineError } from '../../../../shared/components/inline-error/inline-error/inline-error';
import { Button } from '../../../../shared/components/button/button';
import { passwordMatchValidator } from '../register/register';
import type { ApiResponse } from '../../../../core/models/api-response.model';

type ResetField = 'newPassword' | 'confirmPassword';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, InlineError, Button],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css'
})
export class ResetPassword {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly passwordRecoveryService = inject(PasswordRecoveryService);
  private readonly notificationService = inject(NotificationService);
  private readonly httpErrorHandler = inject(HttpErrorHandlerService);

  readonly email = signal('');
  readonly token = signal('');
  readonly linkInvalid = signal(false);

  readonly form = this.fb.nonNullable.group(
    {
      newPassword: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.maxLength(128)
        ]
      ],
      confirmPassword: ['', Validators.required]
    },
    { validators: passwordMatchValidator() }
  );

  loading = false;
  submitted = false;
  resetDone = false;
  generalError = '';
  passwordVisible = false;
  confirmPasswordVisible = false;

  constructor() {
    this.route.queryParamMap.subscribe(params => {
      const email = (params.get('email') ?? '').trim();
      const token = params.get('token') ?? '';

      this.email.set(email);
      this.token.set(token);
      this.linkInvalid.set(email.length === 0 || token.length === 0);
    });
  }

  togglePasswordVisibility(): void {
    this.passwordVisible = !this.passwordVisible;
  }

  toggleConfirmPasswordVisibility(): void {
    this.confirmPasswordVisible = !this.confirmPasswordVisible;
  }

  submit(): void {
    this.submitted = true;
    this.generalError = '';

    if (this.linkInvalid()) {
      return;
    }

    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      return;
    }

    const request = {
      email: this.email(),
      token: this.token(),
      newPassword: this.form.controls.newPassword.value,
      confirmPassword: this.form.controls.confirmPassword.value
    };

    this.loading = true;

    this.passwordRecoveryService.resetPassword(request)
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (response: ApiResponse<string>) => {
          if (!response.success) {
            this.handleFailure(
              response.message ??
              'The password could not be reset. The link may be invalid or expired.'
            );
            return;
          }

          this.form.reset();
          this.submitted = false;
          this.token.set('');
          this.resetDone = true;
          this.notificationService.success(
            response.data ?? 'Your password has been reset successfully.'
          );
        },
        error: (error: unknown) => {
          const result = this.httpErrorHandler.handle(error, {
            fallbackMessage:
              'The password could not be reset. Please try again.',
            fieldAliases: {}
          });

          this.handleFailure(
            this.httpErrorHandler.extractBackendMessage(error) ??
            result.message
          );
        }
      });
  }

  goToLogin(): void {
    void this.router.navigateByUrl('/login');
  }

  showFieldError(field: ResetField): boolean {
    const control = this.form.controls[field];
    return (control.touched || this.submitted) && control.invalid;
  }

  getFieldError(field: ResetField): string | null {
    const control = this.form.controls[field];

    if (!(control.touched || this.submitted)) {
      return null;
    }

    if (control.hasError('required')) {
      return field === 'newPassword'
        ? 'New password is required.'
        : 'Please confirm your new password.';
    }

    if (field === 'newPassword') {
      if (control.hasError('minlength')) {
        return 'Password must be at least 8 characters long.';
      }

      if (control.hasError('maxlength')) {
        return 'Password must not be longer than 128 characters.';
      }
    }

    if (field === 'confirmPassword' && this.form.hasError('passwordMismatch')) {
      return 'Password and confirmation password do not match.';
    }

    return null;
  }

  private handleFailure(message: string): void {
    this.generalError = message;
    this.notificationService.error(message);
  }
}
