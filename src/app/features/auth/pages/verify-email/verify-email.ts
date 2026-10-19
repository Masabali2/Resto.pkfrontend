import {
  AfterViewInit,
  Component,
  ElementRef,
  inject,
  viewChildren
} from '@angular/core';
import { Location } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';
import { OtpService } from '../../../../core/services/otp.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Button } from '../../../../shared/components/button/button';
import type { ApiResponse } from '../../../../core/models/api-response.model';

const OTP_LENGTH = 6;

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [RouterLink, Button],
  templateUrl: './verify-email.html',
  styleUrl: './verify-email.css'
})
export class VerifyEmail implements AfterViewInit {
  private readonly otpService = inject(OtpService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly location = inject(Location);

  readonly digitInputs = viewChildren<ElementRef<HTMLInputElement>>('digitInput');

  email = '';
  emailMissing = false;
  digits: string[] = Array.from({ length: OTP_LENGTH }, () => '');
  generalError = '';
  verifying = false;
  resending = false;
  cooldownSeconds = 0;

  private cooldownTimer: ReturnType<typeof setInterval> | null = null;

  ngAfterViewInit(): void {
    const state = this.location.getState() as { email?: unknown } | null;
    const stateEmail = state?.email;

    if (typeof stateEmail === 'string' && stateEmail.trim().length > 0) {
      this.email = stateEmail.trim();
    } else {
      this.emailMissing = true;
      return;
    }

    this.focusFirstDigit();
  }

  get otpValue(): string {
    return this.digits.join('');
  }

  get isOtpComplete(): boolean {
    return this.digits.every(digit => digit !== '');
  }

  get canVerify(): boolean {
    return this.isOtpComplete && !this.verifying && !this.resending && !this.emailMissing;
  }

  get canResend(): boolean {
    return !this.resending && !this.verifying && this.cooldownSeconds === 0 && !this.emailMissing;
  }

  trackByIndex(index: number): number {
    return index;
  }

  focusFirstDigit(): void {
    this.focusDigit(0);
  }

  onDigitInput(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/\D/g, '');

    if (value === '') {
      this.digits[index] = '';
      input.value = '';
      return;
    }

    let cursor = index;

    for (const char of value.split('')) {
      if (cursor >= OTP_LENGTH) {
        break;
      }
      this.digits[cursor] = char;
      cursor++;
    }

    this.syncInputValues();

    if (cursor < OTP_LENGTH) {
      this.focusDigit(cursor);
    } else {
      this.focusDigit(OTP_LENGTH - 1);
    }
  }

  onDigitKeydown(index: number, event: KeyboardEvent): void {
    if (event.key === 'Backspace') {
      if (this.digits[index] !== '') {
        this.digits[index] = '';
        this.syncInputValues();
        event.preventDefault();
        return;
      }

      if (index > 0) {
        event.preventDefault();
        this.digits[index - 1] = '';
        this.syncInputValues();
        this.focusDigit(index - 1);
      }
      return;
    }

    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      this.focusDigit(index - 1);
      return;
    }

    if (event.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      event.preventDefault();
      this.focusDigit(index + 1);
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      this.verify();
    }
  }

  onDigitPaste(event: ClipboardEvent): void {
    event.preventDefault();

    const pasted = (event.clipboardData?.getData('text') ?? '')
      .replace(/\D/g, '')
      .slice(0, OTP_LENGTH);

    if (pasted.length === 0) {
      return;
    }

    this.digits = Array.from({ length: OTP_LENGTH }, (_, i) => pasted[i] ?? '');
    this.syncInputValues();
    this.focusDigit(Math.min(pasted.length, OTP_LENGTH - 1));
  }

  clearOtp(): void {
    this.digits = Array.from({ length: OTP_LENGTH }, () => '');
    this.syncInputValues();
  }

  verify(): void {
    this.generalError = '';

    if (this.verifying || this.resending) {
      return;
    }

    if (!this.email) {
      this.emailMissing = true;
      return;
    }

    if (!this.isOtpComplete) {
      this.generalError = 'Enter the six-digit code from your email.';
      return;
    }

    const otp = this.otpValue;

    this.verifying = true;

    this.otpService.verifyOtp({ email: this.email, otp })
      .pipe(finalize(() => this.verifying = false))
      .subscribe({
        next: (response: ApiResponse<string>) => {
          if (!response.success) {
            this.clearOtp();
            this.focusFirstDigit();
            this.handleFailure(
              response.message ??
              'This code has expired or is invalid. Request a new code and try again.',
              response.errorCode
            );
            return;
          }

          this.clearOtp();
          this.stopCooldown();
          this.notificationService.success(
            response.data ?? 'Email verified successfully.'
          );
          this.navigateToLoginWithMessage();
        },
        error: (error: unknown) => {
          const errorCode = error instanceof HttpErrorResponse
            ? (error.error?.errorCode ?? null)
            : null;
          const message = this.extractBackendMessage(error) ??
            'Unable to verify your code. Please try again.';

          if (errorCode === 'AUTH_INVALID_OTP' || message.toLowerCase().includes('expired')) {
            this.clearOtp();
            this.focusFirstDigit();
          }

          this.handleFailure(message, errorCode);
        }
      });
  }

  resend(): void {
    this.generalError = '';

    if (this.resending || this.verifying || this.cooldownSeconds > 0) {
      return;
    }

    if (!this.email) {
      this.emailMissing = true;
      return;
    }

    this.resending = true;

    this.otpService.resendOtp({ email: this.email })
      .pipe(finalize(() => this.resending = false))
      .subscribe({
        next: (response: ApiResponse<string>) => {
          if (!response.success) {
            this.handleFailure(
              response.message ?? 'Unable to send a new code. Please try again.',
              response.errorCode
            );
            return;
          }

          this.clearOtp();
          this.focusFirstDigit();
          this.startCooldown(60);
          this.notificationService.success(
            response.data ?? 'A new verification code has been sent.'
          );
        },
        error: (error: unknown) => {
          const status = error instanceof HttpErrorResponse ? error.status : 0;

          if (status === 429) {
            const retryAfter = this.extractRetryAfter(error);
            const message = this.extractBackendMessage(error) ??
              'Please wait before requesting another verification code.';

            this.generalError = message;
            this.startCooldown(retryAfter ?? 60);
            return;
          }

          this.handleFailure(
            this.extractBackendMessage(error) ??
            'Unable to send a new code. Please try again.',
            null
          );
        }
      });
  }

  goToRegister(): void {
    void this.router.navigateByUrl('/register');
  }

  private handleFailure(message: string, errorCode: string | null): void {
    const friendly = errorCode === 'AUTH_INVALID_OTP'
      ? 'This code has expired or is invalid. Request a new code and try again.'
      : message;

    this.generalError = friendly;
    this.notificationService.error(friendly);
  }

  private navigateToLoginWithMessage(): void {
    void this.router.navigate(['/login'], {
      state: { notice: 'Your email is now verified. Please sign in to continue.' }
    });
  }

  private syncInputValues(): void {
    const inputs = this.digitInputs();

    for (let i = 0; i < OTP_LENGTH; i++) {
      if (inputs[i]) {
        inputs[i].nativeElement.value = this.digits[i];
      }
    }
  }

  private focusDigit(index: number): void {
    requestAnimationFrame(() => {
      this.digitInputs()[index]?.nativeElement.focus();
    });
  }

  private startCooldown(seconds: number): void {
    this.stopCooldown();
    this.cooldownSeconds = seconds;

    this.cooldownTimer = setInterval(() => {
      this.cooldownSeconds--;

      if (this.cooldownSeconds <= 0) {
        this.stopCooldown();
      }
    }, 1000);
  }

  private stopCooldown(): void {
    if (this.cooldownTimer !== null) {
      clearInterval(this.cooldownTimer);
      this.cooldownTimer = null;
    }

    this.cooldownSeconds = 0;
  }

  private extractBackendMessage(error: unknown): string | null {
    if (error instanceof HttpErrorResponse) {
      const message = (error.error as ApiResponse<string> | null)?.message;

      if (typeof message === 'string' && message.length > 0) {
        return message;
      }
    }

    return null;
  }

  private extractRetryAfter(error: unknown): number | null {
    if (error instanceof HttpErrorResponse) {
      const retryAfter = (error.error as { retryAfterSeconds?: number } | null)
        ?.retryAfterSeconds;

      if (typeof retryAfter === 'number' && retryAfter > 0) {
        return Math.min(retryAfter, 3600);
      }
    }

    return null;
  }
}
