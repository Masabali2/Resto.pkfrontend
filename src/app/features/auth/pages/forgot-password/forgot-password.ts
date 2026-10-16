import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { PasswordRecoveryService } from '../../../../core/services/password-recovery.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { HttpErrorHandlerService } from '../../../../core/services/http-error-handler.service';
import { InlineError } from '../../../../shared/components/inline-error/inline-error/inline-error';
import { Button } from '../../../../shared/components/button/button';
import type { ApiResponse } from '../../../../core/models/api-response.model';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, InlineError, Button],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css'
})
export class ForgotPassword {
  private readonly fb = inject(FormBuilder);
  private readonly passwordRecoveryService = inject(PasswordRecoveryService);
  private readonly notificationService = inject(NotificationService);
  private readonly httpErrorHandler = inject(HttpErrorHandlerService);
  private readonly router = inject(Router);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(256)]]
  });

  loading = false;
  submitted = false;
  sent = false;
  submittedEmail = '';
  generalError = '';

  submit(): void {
    this.submitted = true;
    this.generalError = '';

    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      return;
    }

    const email = this.form.controls.email.value.trim();

    this.loading = true;

    this.passwordRecoveryService.forgotPassword({ email })
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (response: ApiResponse<string>) => {
          if (!response.success) {
            this.generalError =
              response.message ?? 'Unable to process your request. Please try again.';
            this.notificationService.error(this.generalError);
            return;
          }

          this.submittedEmail = email;
          this.sent = true;
        },
        error: (error: unknown) => {
          const result = this.httpErrorHandler.handle(error, {
            fallbackMessage: 'Unable to process your request. Please try again.',
            fieldAliases: {}
          });

          this.generalError = result.message;
          this.notificationService.error(result.message);
        }
      });
  }

  retry(): void {
    this.sent = false;
    this.submitted = false;
    this.generalError = '';
    this.form.reset();
  }

  goToLogin(): void {
    void this.router.navigateByUrl('/login');
  }

  showFieldError(): boolean {
    const control = this.form.controls.email;
    return (control.touched || this.submitted) && control.invalid;
  }

  getFieldError(): string | null {
    const control = this.form.controls.email;

    if (!(control.touched || this.submitted)) {
      return null;
    }

    if (control.hasError('required')) {
      return 'Email is required.';
    }

    if (control.hasError('email')) {
      return 'A valid email address is required.';
    }

    if (control.hasError('maxlength')) {
      return 'Email must not be longer than 256 characters.';
    }

    return null;
  }
}
