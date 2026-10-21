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
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { MenuService } from '../../services/menu.service';
import { HttpErrorHandlerService } from '../../../../core/services/http-error-handler.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Button } from '../../../../shared/components/button/button';
import { LoadingSpinner } from '../../../../shared/components/loading-spinner/loading-spinner';
import type { ApiResponse } from '../../../../core/models/api-response.model';
import type { MenuItemDto } from '../../models/menu-item.model';
import { parsePrice, DEFAULT_CURRENCY } from '../../models/menu-price.util';

function orNull(value: string | null): string | null {
  const trimmed = (value ?? '').trim();

  return trimmed.length > 0 ? trimmed : null;
}

const PRICE_PATTERN = /^\d+(\.\d{1,2})?$/;
const DISPLAY_ORDER_PATTERN = /^\d+$/;

@Component({
  selector: 'app-menu-item-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    Button,
    LoadingSpinner
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './menu-item-form.html',
  styleUrl: './menu-item-form.css'
})
export class MenuItemForm {
  private readonly fb = inject(FormBuilder);
  private readonly menuService = inject(MenuService);
  private readonly httpErrorHandler = inject(HttpErrorHandlerService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
    description: ['', [Validators.maxLength(1000)]],
    price: ['', [Validators.required, Validators.pattern(PRICE_PATTERN)]],
    displayOrder: ['', [Validators.pattern(DISPLAY_ORDER_PATTERN)]],
    isAvailable: [true]
  });

  protected readonly submitting = signal(false);
  protected readonly submitted = signal(false);
  protected readonly generalError = signal('');
  protected readonly fieldErrors = signal<Record<string, string>>({});
  protected readonly loading = signal(true);

  protected readonly menuId = this.route.snapshot.paramMap.get('menuId') ?? '';
  protected readonly categoryId = this.route.snapshot.paramMap.get('categoryId') ?? '';
  protected readonly itemId = this.route.snapshot.paramMap.get('itemId') ?? null;
  protected readonly isEdit = this.itemId !== null;

  protected readonly pageTitle = computed(() =>
    this.isEdit ? 'Edit Item' : 'Create Item'
  );
  protected readonly currency = DEFAULT_CURRENCY;

  protected readonly menuName = signal('');

  constructor() {
    if (this.isEdit && this.itemId) {
      this.menuService.getItem(this.itemId)
        .pipe(finalize(() => this.loading.set(false)))
        .subscribe({
          next: (response: ApiResponse<MenuItemDto>) => {
            if (!response.success || !response.data) {
              this.generalError.set(response.message ?? 'Unable to load the item.');
              return;
            }

            const item = response.data;
            this.menuName.set(item.name);
            this.form.patchValue({
              name: item.name,
              description: orNull(item.description) ?? '',
              price: item.price.toFixed(2),
              displayOrder: item.displayOrder > 0 ? String(item.displayOrder) : '',
              isAvailable: item.isAvailable
            });
          },
          error: error => {
            this.generalError.set(
              this.httpErrorHandler.extractBackendMessage(error) ??
                'Unable to load the item. Please try again.'
            );
          }
        });
    } else {
      this.loading.set(false);
    }
  }

  protected showFieldError(field: 'name' | 'description' | 'price' | 'displayOrder'): boolean {
    const control = this.form.controls[field];

    return (control.touched || this.submitted()) && control.invalid;
  }

  protected getFieldError(field: 'name' | 'description' | 'price' | 'displayOrder'): string | null {
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

    if (control.hasError('pattern')) {
      if (field === 'price') {
        return 'Price must be a non-negative number with up to 2 decimal places (e.g. 12.50).';
      }

      if (field === 'displayOrder') {
        return 'Display order must be a whole number.';
      }
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
    const price = parsePrice(value.price);

    if (price === null) {
      this.generalError.set('Enter a valid price.');
      this.form.controls.price.markAsTouched();
      return;
    }

    const request = {
      name: value.name.trim(),
      price,
      description: orNull(value.description),
      currency: this.currency,
      imageFileId: null,
      displayOrder: value.displayOrder.trim().length > 0 ? Number(value.displayOrder) : null
    };

    this.submitting.set(true);

    const save = this.isEdit && this.itemId
      ? this.menuService.updateItem(this.itemId, {
          name: request.name,
          description: request.description,
          price: request.price,
          currency: request.currency,
          imageFileId: null,
          clearImage: false,
          displayOrder: request.displayOrder
        })
      : this.menuService.createItem(this.categoryId, request);

    save
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (response: ApiResponse<MenuItemDto>) => {
          if (!response.success || !response.data) {
            this.applyResponseErrors(response);
            return;
          }

          this.notificationService.success(
            `${this.isEdit ? 'Item' : 'Menu item'} saved.`
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
            fallbackMessage: 'The item could not be saved. Please try again.'
          });

          this.fieldErrors.set(details.fieldErrors);
          this.generalError.set(
            details.message || Object.values(details.fieldErrors)[0] ||
              'The item could not be saved. Please try again.'
          );
        }
      });
  }

  private applyResponseErrors(response: ApiResponse<MenuItemDto>): void {
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
        'The item could not be saved. Please review the form and try again.'
    );

    if (Object.keys(errors).length === 0) {
      this.notificationService.error(this.generalError());
    }
  }

  private mapApiField(field: string): string | null {
    const normalized = field.replace(/Dto$/i, '').toLowerCase();

    const map: Record<string, 'name' | 'description' | 'price' | 'currency' | 'displayOrder' | null> = {
      name: 'name',
      description: 'description',
      price: 'price',
      currency: 'currency',
      displayorder: 'displayOrder'
    };

    return map[normalized] ?? null;
  }

  private fieldLabel(field: string): string {
    const labels: Record<string, string> = {
      name: 'Item name',
      description: 'Description',
      price: 'Price',
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
