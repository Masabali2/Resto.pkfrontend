
import { Component, computed, inject, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { RestaurantService } from '../../../../core/services/restaurant.service';
import { HttpErrorHandlerService } from '../../../../core/services/http-error-handler.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { SubscriptionFlowService } from '../../../subscription/services/subscription-flow.service';
import { SubscriptionRequiredDialog } from '../../../subscription/components/subscription-required-dialog/subscription-required-dialog';
import { Button } from '../../../../shared/components/button/button';
import { InlineError } from '../../../../shared/components/inline-error/inline-error/inline-error';
import type { ApiResponse } from '../../../../core/models/api-response.model';
import {BackLink} from '../../../../shared/components/back-link/back-link';
import type {
  CreateRestaurantRequest,
  RestaurantDto
} from '../../../websites/models/restaurant.model';

type SetupField =
  | 'name'
  | 'description'
  | 'phone'
  | 'email'
  | 'line1'
  | 'city'
  | 'country'
  | 'timeZone';

const PHONE_PATTERN = /^\+?[0-9\s\-()]{7,20}$/;

function orNull(value: string): string | null {
  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

@Component({
  selector: 'app-restaurant-setup',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    Button,
    InlineError,
    BackLink,
    SubscriptionRequiredDialog
  ],
  templateUrl: './restaurant-setup.html',
  styleUrl: './restaurant-setup.css'
})
export class RestaurantSetup {
  private readonly fb = inject(FormBuilder);
  private readonly restaurantService = inject(RestaurantService);
  private readonly notificationService = inject(NotificationService);
  private readonly httpErrorHandler = inject(HttpErrorHandlerService);
  private readonly router = inject(Router);

  /** Shared subscription flow — the same one the dashboard uses. */
  protected readonly subscriptionFlow = inject(SubscriptionFlowService);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
    description: ['', [Validators.maxLength(1000)]],
    phone: ['', [Validators.pattern(PHONE_PATTERN)]],
    email: ['', [Validators.email, Validators.maxLength(256)]],
    line1: ['', [Validators.required, Validators.maxLength(200)]],
    line2: ['', [Validators.maxLength(200)]],
    city: ['', [Validators.required, Validators.maxLength(100)]],
    country: ['', [Validators.required, Validators.maxLength(100)]],
    postalCode: ['', [Validators.maxLength(20)]],
    timeZone: ['Asia/Karachi', [Validators.required, Validators.maxLength(64)]]
  });

  protected readonly submitting = signal(false);
  protected readonly submitted = signal(false);
  protected readonly createdRestaurant = signal<RestaurantDto | null>(null);
  protected readonly generalError = signal('');
  protected readonly fieldErrors = signal<Record<string, string>>({});

  protected readonly supportedTimeZones = [
    'Asia/Karachi',
    'Asia/Dhaka',
    'Asia/Kolkata',
    'Asia/Dubai',
    'Europe/London',
    'America/New_York'
  ];

  protected showFieldError(field: SetupField): boolean {
    const control = this.form.controls[field];

    return (control.touched || this.submitted()) && control.invalid;
  }

  protected getFieldError(field: SetupField): string | null {
    const control = this.form.controls[field];
    const apiError = this.fieldErrors()[field];

    if (!(control.touched || this.submitted())) {
      return null;
    }

    if (apiError) {
      return apiError;
    }

    if (control.hasError('required')) {
      return `${this.fieldLabel(field)} is required.`;
    }

    if (control.hasError('email')) {
      return 'Enter a valid contact email address.';
    }

    if (control.hasError('pattern') && field === 'phone') {
      return 'Enter a valid phone number (e.g. +92 300 1234567).';
    }

    if (control.hasError('maxlength')) {
      return `${this.fieldLabel(field)} exceeds the maximum allowed length.`;
    }

    return null;
  }

  protected submit(): void {
    if (this.submitting()) {
      return;
    }

    this.submitted.set(true);
    this.generalError.set('');
    this.fieldErrors.set({});

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.generalError.set(
        'Please review the highlighted fields and correct the errors before continuing.'
      );
      return;
    }

    const value = this.form.getRawValue();

    const request: CreateRestaurantRequest = {
      name: value.name.trim(),
      description: orNull(value.description),
      phone: orNull(value.phone),
      email: orNull(value.email),
      address: {
        line1: value.line1.trim(),
        line2: orNull(value.line2),
        city: value.city.trim(),
        country: value.country.trim(),
        postalCode: orNull(value.postalCode)
      },
      timeZone: value.timeZone
    };

    this.submitting.set(true);

    this.restaurantService.createRestaurant(request)
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (response: ApiResponse<RestaurantDto>) => {
          if (!response.success || !response.data) {
            this.applyResponseErrors(response);
            return;
          }

          this.createdRestaurant.set(response.data);
          this.notificationService.success(
            `${response.data.name} has been added to your workspace.`
          );
        },
        error: (error: unknown) => {
          // The subscription can lapse between loading this page and sending
          // the form. The backend stays the authority: when it reports that
          // the workspace has no eligible subscription the shared
          // subscription experience is opened instead of a generic failure.
          if (this.subscriptionFlow.isSubscriptionRequiredError(error)) {
            this.generalError.set(
              'Your workspace needs an active subscription to add a restaurant.'
            );

            this.subscriptionFlow.open(
              'Adding a restaurant needs an active workspace subscription.'
            );

            return;
          }

          const details = this.httpErrorHandler.handle(error, {
            unauthorizedMessage: 'Your session has expired. Please sign in again.',
            fallbackMessage: 'The restaurant could not be created. Please try again.'
          });

          this.fieldErrors.set(details.fieldErrors);

          this.generalError.set(
            details.message ||
            Object.values(details.fieldErrors)[0] ||
            'The restaurant could not be created. Please try again.'
          );
        }
      });
  }

  protected goToCreateWebsite(): void {
    const restaurant = this.createdRestaurant();

    if (!restaurant) {
      return;
    }

    void this.router.navigate(['/websites/new'], {
      queryParams: { restaurantId: restaurant.id }
    });
  }

  protected goToWebsites(): void {
    void this.router.navigate(['/websites']);
  }

  protected startTrial(): void {
    this.subscriptionFlow.startTrial();
  }

  protected viewPlans(): void {
    this.subscriptionFlow.viewPlans();
  }

  protected closeSubscription(): void {
    this.subscriptionFlow.close();
  }

  /** True when the backend says the workspace may not use this feature. */
  protected readonly subscriptionBlocked = computed(() => {
    const state = this.subscriptionFlow.state();

    if (!state) {
      return false;
    }

    return !this.subscriptionFlow.canUseProtectedFeatures(state);
  });

  private applyResponseErrors(response: ApiResponse<RestaurantDto>): void {
    const errors: Record<string, string> = {};

    for (const item of response.errors ?? []) {
      const key = this.mapApiField(item.field);

      if (key && !errors[key]) {
        errors[key] = item.message;
      }
    }

    this.fieldErrors.set(errors);

    this.generalError.set(
      response.message ||
      Object.values(errors)[0] ||
      'The restaurant could not be created. Please review the form and try again.'
    );

    if (Object.keys(errors).length === 0) {
      this.notificationService.error(this.generalError());
    }
  }

  private mapApiField(field: string): string | null {
    const normalized = field
      .replace(/^address\./i, '')
      .replace(/Dto$/i, '')
      .toLowerCase();

    const map: Record<string, keyof typeof this.form.controls | null> = {
      name: 'name',
      description: 'description',
      phone: 'phone',
      email: 'email',
      line1: 'line1',
      line2: 'line2',
      city: 'city',
      country: 'country',
      postalcode: 'postalCode',
      timezone: 'timeZone'
    };

    return map[normalized] ?? null;
  }

  private fieldLabel(field: SetupField): string {
    const labels: Record<SetupField, string> = {
      name: 'Restaurant name',
      description: 'Restaurant description',
      phone: 'Phone number',
      email: 'Contact email',
      line1: 'Address line 1',
      city: 'City',
      country: 'Country',
      timeZone: 'Time zone'
    };

    return labels[field];
  }
}
