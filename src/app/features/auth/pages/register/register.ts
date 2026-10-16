import { Component, inject } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { HttpErrorHandlerService } from '../../../../core/services/http-error-handler.service';
import { InlineError } from '../../../../shared/components/inline-error/inline-error/inline-error';
import { Button } from '../../../../shared/components/button/button';
import type { ApiResponse } from '../../../../core/models/api-response.model';
import type { AuthenticatedUser, RegisterRequest } from '../../../../core/models/auth.model';

type RegisterField = 'email' | 'userName' | 'password' | 'confirmPassword';

const USERNAME_PATTERN = /^[a-zA-Z0-9_.-]+$/;

export function passwordMatchValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;

    if (!password || !confirmPassword) {
      return null;
    }

    return password === confirmPassword
      ? null
      : { passwordMismatch: true };
  };
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, InlineError, Button],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class Register {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly httpErrorHandler = inject(HttpErrorHandlerService);

  readonly form = this.fb.nonNullable.group(
    {
      email: [
        '',
        [
          Validators.required,
          Validators.email,
          Validators.maxLength(256)
        ]
      ],
      userName: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(50),
          Validators.pattern(USERNAME_PATTERN)
        ]
      ],
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.maxLength(128),
          Validators.pattern(/[A-Z]/),
          Validators.pattern(/[a-z]/),
          Validators.pattern(/[0-9]/),
          Validators.pattern(/[^a-zA-Z0-9]/)
        ]
      ],
      confirmPassword: ['', Validators.required]
    },
    { validators: passwordMatchValidator() }
  );

  loading = false;
  submitted = false;
  registrationComplete = false;
  showVerifyModal = false;
  registeredEmail = '';
  generalError = '';
  fieldErrors: Partial<Record<RegisterField, string>> = {};
  passwordVisible = false;
  confirmPasswordVisible = false;

  togglePasswordVisibility(): void {
    this.passwordVisible = !this.passwordVisible;
  }

  toggleConfirmPasswordVisibility(): void {
    this.confirmPasswordVisible = !this.confirmPasswordVisible;
  }

  submit(): void {
    this.submitted = true;
    this.generalError = '';
    this.fieldErrors = {};

    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      return;
    }

    const request: RegisterRequest = {
      email: this.form.controls.email.value.trim(),
      userName: this.form.controls.userName.value.trim(),
      password: this.form.controls.password.value,
      confirmPassword: this.form.controls.confirmPassword.value
    };

    this.loading = true;

    this.authService.register(request)
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (response: ApiResponse<AuthenticatedUser>) => {
          if (!response.success) {
            const message =
              response.message ?? 'Unable to create your account. Please try again.';

            this.applyBackendErrors(message, response.errors ?? []);
            return;
          }

          this.registeredEmail = response.data?.email ?? request.email;
          this.registrationComplete = true;
          this.showVerifyModal = true;
          this.notificationService.success(
            'Account created successfully. Please verify your email to continue.'
          );
        },
        error: (error: unknown) => {
          this.handleRegistrationError(error);
        }
      });
  }

  goToLogin(): void {
    void this.router.navigateByUrl('/login');
  }

  openVerifyModal(): void {
    this.showVerifyModal = true;
  }

  closeVerifyModal(): void {
    this.showVerifyModal = false;
  }

  goToVerifyEmail(): void {
    this.showVerifyModal = false;
    void this.router.navigate(['/verify-email'], {
      state: { email: this.registeredEmail }
    });
  }

  showFieldError(field: RegisterField): boolean {
    const control = this.form.controls[field];

    return (control.touched || this.submitted) &&
      (control.invalid || !!this.fieldErrors[field]);
  }

  getFieldError(field: RegisterField): string | null {
    const control = this.form.controls[field];

    if (!(control.touched || this.submitted)) {
      return null;
    }

    if (this.fieldErrors[field]) {
      return this.fieldErrors[field]!;
    }

    return this.getValidationError(field, control);
  }

  private getValidationError(
    field: RegisterField,
    control: AbstractControl
  ): string | null {
    if (control.hasError('required')) {
      switch (field) {
        case 'email':
          return 'Email is required.';
        case 'userName':
          return 'Username is required.';
        case 'password':
          return 'Password is required.';
        case 'confirmPassword':
          return 'Please confirm your password.';
      }
    }

    if (field === 'email') {
      if (control.hasError('email')) {
        return 'Enter a valid email address.';
      }

      if (control.hasError('maxlength')) {
        return 'Email must not be longer than 256 characters.';
      }
    }

    if (field === 'userName') {
      if (control.hasError('minlength')) {
        return 'Username must be at least 3 characters long.';
      }

      if (control.hasError('maxlength')) {
        return 'Username must not be longer than 50 characters.';
      }

      if (control.hasError('pattern')) {
        return 'Username may contain letters, numbers, periods, underscores, and hyphens.';
      }
    }

    if (field === 'password') {
      if (control.hasError('minlength')) {
        return 'Password must be at least 8 characters long.';
      }

      if (control.hasError('maxlength')) {
        return 'Password must not be longer than 128 characters.';
      }

      if (control.hasError('pattern')) {
        const requiredPatterns: Array<[RegExp, string]> = [
          [/[A-Z]/, 'Password must contain an uppercase letter.'],
          [/[a-z]/, 'Password must contain a lowercase letter.'],
          [/[0-9]/, 'Password must contain a digit.'],
          [/[^a-zA-Z0-9]/, 'Password must contain a non-alphanumeric character.']
        ];

        const missing = requiredPatterns.find(([pattern]) =>
          !pattern.test(control.value as string)
        );

        if (missing) {
          return missing[1];
        }
      }
    }

    if (field === 'confirmPassword' && this.form.hasError('passwordMismatch')) {
      return 'Password and confirmation password do not match.';
    }

    return null;
  }

  private handleRegistrationError(error: unknown): void {
    const result = this.httpErrorHandler.handle(error, {
      fallbackMessage: 'Unable to create your account. Please try again.',
      fieldAliases: {}
    });

    this.applyMappedErrors(result.message, result.fieldErrors);
  }

  private applyBackendErrors(
    message: string,
    errors: Array<{ field: string; message: string }>
  ): void {
    const fieldErrors: Record<string, string> = {};

    for (const item of errors) {
      const field = this.normalizeFieldKey(item.field);

      if (field && !fieldErrors[field]) {
        fieldErrors[field] = item.message;
      }
    }

    this.applyMappedErrors(message, fieldErrors);
  }

  private applyMappedErrors(
    message: string,
    fieldErrors: Record<string, string>
  ): void {
    const mapped: Partial<Record<RegisterField, string>> = {};

    for (const [key, value] of Object.entries(fieldErrors)) {
      const field = this.normalizeFieldKey(key);

      if (field) {
        mapped[field] = value;
      }
    }

    this.fieldErrors = mapped;

    if (Object.keys(mapped).length > 0) {
      this.generalError = '';
      return;
    }

    this.generalError = message;
    this.notificationService.error(message);
  }

  private normalizeFieldKey(key: string): RegisterField | null {
    const normalized = key.replace(/[\s_-]/g, '').toLowerCase();

    switch (normalized) {
      case 'email':
        return 'email';
      case 'username':
        return 'userName';
      case 'password':
        return 'password';
      case 'confirmpassword':
        return 'confirmPassword';
      default:
        return null;
    }
  }
}
