import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MenuService } from '../../services/menu.service';
import { HttpErrorHandlerService } from '../../../../core/services/http-error-handler.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Button } from '../../../../shared/components/button/button';
import { LoadingSpinner } from '../../../../shared/components/loading-spinner/loading-spinner';
import type { ApiResponse } from '../../../../core/models/api-response.model';
import type { MenuDetailsDto } from '../../models/menu.model';
import type { MenuCategoryDto } from '../../models/menu-category.model';

function orNull(value: string | null): string | null {
  const trimmed = (value ?? '').trim();

  return trimmed.length > 0 ? trimmed : null;
}

function orNullNumber(value: string): number | null {
  const trimmed = value.trim();

  return trimmed.length > 0 ? Number(trimmed) : null;
}

const DISPLAY_ORDER_PATTERN = /^\d+$/;

@Component({
  selector: 'app-menu-category-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    Button,
    LoadingSpinner
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './menu-category-form.html',
  styleUrl: './menu-category-form.css'
})
export class MenuCategoryForm {
  private readonly fb = inject(FormBuilder);
  private readonly menuService = inject(MenuService);
  private readonly httpErrorHandler = inject(HttpErrorHandlerService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    description: ['', [Validators.maxLength(500)]],
    displayOrder: ['', [Validators.pattern(DISPLAY_ORDER_PATTERN)]]
  });

  protected readonly submitting = signal(false);
  protected readonly submitted = signal(false);
  protected readonly generalError = signal('');
  protected readonly fieldErrors = signal<Record<string, string>>({});
  protected readonly loading = signal(true);

  protected readonly menuId = this.route.snapshot.paramMap.get('menuId') ?? '';
  protected readonly categoryId = this.route.snapshot.paramMap.get('categoryId') ?? null;
  protected readonly isEdit = this.categoryId !== null;

  protected readonly pageTitle = computed(() =>
    this.isEdit ? 'Edit Category' : 'Create Category'
  );

  protected readonly menuName = signal('');

  constructor() {
    this.menuService.getMenu(this.menuId)
      .pipe(finalize(() => this.loading.set(false)), takeUntilDestroyed())
      .subscribe({
        next: (response: ApiResponse<MenuDetailsDto>) => {
          if (!response.success || !response.data) {
            this.generalError.set(response.message ?? 'Unable to load the menu.');
            return;
          }

          this.menuName.set(response.data.name);

          if (this.isEdit && this.categoryId) {
            const category = response.data.categories.find(c => c.id === this.categoryId);

            if (!category) {
              this.generalError.set('Category not found.');
              return;
            }

            this.form.patchValue({
              name: category.name,
              description: orNull(category.description) ?? '',
              displayOrder: category.displayOrder > 0 ? String(category.displayOrder) : ''
            });
          }
        },
        error: error => {
          this.generalError.set(
            this.httpErrorHandler.extractBackendMessage(error) ??
              'Unable to load the menu. Please try again.'
          );
        }
      });
  }

  protected showFieldError(field: 'name' | 'description' | 'displayOrder'): boolean {
    const control = this.form.controls[field];

    return (control.touched || this.submitted()) && control.invalid;
  }

  protected getFieldError(field: 'name' | 'description' | 'displayOrder'): string | null {
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

    if (control.hasError('pattern') && field === 'displayOrder') {
      return 'Display order must be a whole number.';
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
    const menu = this.menuId;
    const request: {
      name: string;
      description: string | null;
      displayOrder: number | null;
    } = {
      name: value.name.trim(),
      description: orNull(value.description),
      displayOrder: orNullNumber(value.displayOrder)
    };

    this.submitting.set(true);

    const save = this.isEdit && this.categoryId
      ? this.menuService.updateCategory(this.categoryId, {
          name: request.name,
          description: request.description,
          displayOrder: request.displayOrder
        })
      : this.menuService.createCategory(menu, request);

    save
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (response: ApiResponse<MenuCategoryDto>) => {
          if (!response.success || !response.data) {
            this.applyResponseErrors(response);
            return;
          }

          this.notificationService.success(
            `${this.isEdit ? 'Category' : 'Menu category'} saved.`
          );
          this.form.markAsPristine();
          this.submitted.set(false);
          void this.router.navigate(['/menus', this.menuId], {
            queryParams: { restaurantId: this.route.snapshot.queryParamMap.get('restaurantId') },
            queryParamsHandling: 'merge'
          });
        },
        error: error => {
          const details = this.httpErrorHandler.handle(error, {
            unauthorizedMessage: 'Your session has expired. Please sign in again.',
            fallbackMessage: 'The category could not be saved. Please try again.'
          });

          this.fieldErrors.set(details.fieldErrors);
          this.generalError.set(
            details.message || Object.values(details.fieldErrors)[0] ||
              'The category could not be saved. Please try again.'
          );
        }
      });
  }

  private applyResponseErrors(response: ApiResponse<MenuCategoryDto>): void {
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
        'The category could not be saved. Please review the form and try again.'
    );

    if (Object.keys(errors).length === 0) {
      this.notificationService.error(this.generalError());
    }
  }

  private mapApiField(field: string): string | null {
    const normalized = field.replace(/Dto$/i, '').toLowerCase();

    const map: Record<string, 'name' | 'description' | 'displayOrder' | null> = {
      name: 'name',
      description: 'description',
      displayorder: 'displayOrder'
    };

    return map[normalized] ?? null;
  }

  private fieldLabel(field: string): string {
    const labels: Record<string, string> = {
      name: 'Category name',
      description: 'Description',
      displayOrder: 'Display order'
    };

    return labels[field] ?? field;
  }

  protected cancel(): void {
    this.form.markAsPristine();
    this.submitted.set(false);
    void this.router.navigate(['/menus', this.menuId], {
      queryParams: { restaurantId: this.route.snapshot.queryParamMap.get('restaurantId') },
      queryParamsHandling: 'merge'
    });
  }
}
