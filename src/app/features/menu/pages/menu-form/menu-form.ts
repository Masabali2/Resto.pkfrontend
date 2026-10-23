import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { MenuService } from '../../services/menu.service';
import { HttpErrorHandlerService } from '../../../../core/services/http-error-handler.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Button } from '../../../../shared/components/button/button';
import { LoadingSpinner } from '../../../../shared/components/loading-spinner/loading-spinner';
import type { ApiResponse } from '../../../../core/models/api-response.model';
import type { MenuDto } from '../../models/menu.model';

function orNull(value: string | null): string | null {
  const trimmed = (value ?? '').trim();

  return trimmed.length > 0 ? trimmed : null;
}

@Component({
  selector: 'app-menu-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    Button,
    LoadingSpinner
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './menu-form.html',
  styleUrl: './menu-form.css'
})
export class MenuForm {
  private readonly fb = inject(FormBuilder);
  private readonly menuService = inject(MenuService);
  private readonly httpErrorHandler = inject(HttpErrorHandlerService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
    description: ['', [Validators.maxLength(1000)]]
  });

  protected readonly submitting = signal(false);
  protected readonly submitted = signal(false);
  protected readonly generalError = signal('');
  protected readonly fieldErrors = signal<Record<string, string>>({});
  protected readonly loading = signal(true);

  protected readonly menuId = this.route.snapshot.paramMap.get('menuId') ?? null;
  protected readonly restaurantId = this.route.snapshot.queryParamMap.get('restaurantId') ?? null;
  protected readonly isEdit = this.menuId !== null;

  protected readonly pageTitle = computed(() =>
    this.isEdit ? 'Edit Menu' : 'Create Menu'
  );

  protected readonly restaurantName = signal('');

  constructor() {
    if (this.isEdit && this.menuId) {
      this.menuService.getMenu(this.menuId)
        .pipe(finalize(() => this.loading.set(false)))
        .subscribe({
          next: (response: ApiResponse<MenuDto>) => {
            if (!response.success || !response.data) {
              this.generalError.set(response.message ?? 'Unable to load the menu.');
              return;
            }

            const menu = response.data;
            this.form.patchValue({
              name: menu.name,
              description: orNull(menu.description) ?? ''
            });
          },
          error: error => {
            this.generalError.set(
              this.httpErrorHandler.extractBackendMessage(error) ??
                'Unable to load the menu. Please try again.'
            );
          }
        });
    } else {
      this.loading.set(false);
    }
  }

  protected showFieldError(field: 'name' | 'description'): boolean {
    const control = this.form.controls[field];

    return (control.touched || this.submitted()) && control.invalid;
  }

  protected getFieldError(field: 'name' | 'description'): string | null {
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

    if (control.hasError('maxlength')) {
      return `${this.fieldLabel(field)} is too long.`;
    }

    return null;
  }

  protected submit(): void {
    this.submitted.set(true);
    this.generalError.set('');
    this.fieldErrors.set({});

    if (this.submitting()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.generalError.set('Please complete the required fields before continuing.');
      return;
    }

    const value = this.form.getRawValue();
    const request = {
      name: value.name.trim(),
      description: orNull(value.description)
    };

    this.submitting.set(true);

    const save = this.isEdit && this.menuId
      ? this.menuService.updateMenu(this.menuId, request)
      : this.restaurantId
        ? this.menuService.createMenu(this.restaurantId, request)
        : null;

    if (!save) {
      this.generalError.set('No restaurant selected. Select a restaurant first.');
      this.submitting.set(false);
      return;
    }

    save
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (response: ApiResponse<MenuDto>) => {
          if (!response.success || !response.data) {
            this.applyResponseErrors(response);
            return;
          }

          this.notificationService.success(
            `${this.isEdit ? 'Menu' : 'Menu'} saved.`
          );
          this.form.markAsPristine();
          this.submitted.set(false);
          const menu = response.data;
          void this.router.navigate(['/menus', menu.id], {
            queryParams: { restaurantId: menu.restaurantId },
            queryParamsHandling: 'merge'
          });
        },
        error: error => {
          const details = this.httpErrorHandler.handle(error, {
            unauthorizedMessage: 'Your session has expired. Please sign in again.',
            fallbackMessage: 'The menu could not be saved. Please try again.'
          });

          this.fieldErrors.set(details.fieldErrors);
          this.generalError.set(
            details.message || Object.values(details.fieldErrors)[0] ||
              'The menu could not be saved. Please try again.'
          );
        }
      });
  }

  private applyResponseErrors(response: ApiResponse<MenuDto>): void {
    const errors: Record<string, string> = {};

    for (const item of response.errors ?? []) {
      const key = this.mapApiField(item.field);

      if (key && !errors[key]) {
        errors[key] = item.message;
      }
    }

    this.fieldErrors.set(errors);
    this.generalError.set(
      response.message ?? Object.values(errors)[0] ??
        'The menu could not be saved. Please review the form and try again.'
    );

    if (Object.keys(errors).length === 0) {
      this.notificationService.error(this.generalError());
    }
  }

  private mapApiField(field: string): string | null {
    const normalized = field.replace(/Dto$/i, '').toLowerCase();

    const map: Record<string, 'name' | 'description' | null> = {
      name: 'name',
      description: 'description'
    };

    return map[normalized] ?? null;
  }

  private fieldLabel(field: string): string {
    const labels: Record<string, string> = {
      name: 'Menu name',
      description: 'Description'
    };

    return labels[field] ?? field;
  }

  protected cancel(): void {
    this.form.markAsPristine();
    this.submitted.set(false);
    void this.router.navigate(['/menus'], {
      queryParams: { restaurantId: this.restaurantId },
      queryParamsHandling: 'merge'
    });
  }
}
