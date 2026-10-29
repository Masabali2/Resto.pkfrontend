import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { finalize } from 'rxjs';
import { MenuService } from '../../services/menu.service';
import { HttpErrorHandlerService } from '../../../../core/services/http-error-handler.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Button } from '../../../../shared/components/button/button';
import { LoadingSpinner } from '../../../../shared/components/loading-spinner/loading-spinner';
import { ImageUploadComponent } from '../../../../shared/components/image-upload/image-upload.component';
import type { ApiResponse } from '../../../../core/models/api-response.model';
import type { MenuItemDto, CreateMenuItemRequest, UpdateMenuItemRequest } from '../../models/menu-item.model';
import type { MenuCategoryDto } from '../../models/menu-category.model';
import type { MenuItemDestination } from '../../../websites/models/image-upload.model';
import { parsePrice, DEFAULT_CURRENCY } from '../../models/menu-price.util';

function orNull(value: string | null): string | null {
  const trimmed = (value ?? '').trim();
  return trimmed.length > 0 ? trimmed : null;
}

const PRICE_PATTERN = /^\d+(\.\d{1,2})?$/;
const DISPLAY_ORDER_PATTERN = /^\d+$/;

type FormFieldName = 'name' | 'categoryId' | 'description' | 'price' | 'displayOrder';

@Component({
  selector: 'app-menu-item-modal',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    Button,
    LoadingSpinner,
    ImageUploadComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './menu-item-modal.html',
  styleUrl: './menu-item-modal.css'
})
export class MenuItemModal {
  private readonly fb = inject(FormBuilder);
  private readonly menuService = inject(MenuService);
  private readonly httpErrorHandler = inject(HttpErrorHandlerService);
  private readonly notificationService = inject(NotificationService);

  readonly open = input<boolean>(false);
  readonly mode = input<'create' | 'edit'>('create');
  readonly item = input<MenuItemDto | null>(null);
  readonly categories = input<MenuCategoryDto[]>([]);

  readonly saved = output<void>();
  readonly cancelled = output<void>();

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
    categoryId: ['', Validators.required],
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

  protected readonly createdItemId = signal<string | null>(null);
  protected readonly imageUploading = signal(false);
  protected readonly imageError = signal('');
  protected readonly itemImageFileId = signal<string | null>(null);

  protected readonly pageTitle = computed(() =>
    this.mode() === 'edit' ? 'Edit Item' : 'Add Food Item'
  );
  protected readonly currency = DEFAULT_CURRENCY;
  protected readonly isEdit = computed(() => this.mode() === 'edit');

  /** Upload destination: existing item on edit, or newly created item on create. */
  protected readonly uploadDestination = computed<MenuItemDestination | null>(() => {
    const id = this.isEdit() ? (this.item()?.id ?? null) : this.createdItemId();
    if (!id) return null;
    return { kind: 'menu-item', menuItemId: id };
  });

  /** Category selected for create (defaults to first category). */
  protected readonly selectedCategoryId = computed(() => {
    if (this.isEdit()) return this.item()?.menuCategoryId ?? null;
    const id = this.form.controls.categoryId.value;
    return id || null;
  });

  constructor() {
    effect(() => {
      if (!this.open()) {
        this.resetForm();
        return;
      }

      this.loading.set(true);
      this.generalError.set('');
      this.fieldErrors.set({});
      this.createdItemId.set(null);
      this.imageError.set('');
      this.itemImageFileId.set(null);

      const itemToEdit = this.item();
      if (this.isEdit() && itemToEdit) {
        this.loadEditItem(itemToEdit);
      } else {
        this.form.reset({
          name: '',
          categoryId: this.categories()[0]?.id ?? '',
          description: '',
          price: '',
          displayOrder: '',
          isAvailable: true
        });
        this.submitted.set(false);
        this.loading.set(false);
      }
    });
  }

  private loadEditItem(item: MenuItemDto): void {
    this.menuService.getItem(item.id)
        .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response: ApiResponse<MenuItemDto>) => {
          if (!response.success || !response.data) {
            this.generalError.set(response.message ?? 'Unable to load the item.');
            return;
          }
          const data = response.data;
          this.itemImageFileId.set(data.imageFileId ?? null);
          this.form.patchValue({
            name: data.name,
            categoryId: data.menuCategoryId,
            description: orNull(data.description) ?? '',
            price: data.price.toFixed(2),
            displayOrder: data.displayOrder > 0 ? String(data.displayOrder) : '',
            isAvailable: data.isAvailable
          });
          this.submitted.set(false);
        },
        error: error => {
          this.generalError.set(
            this.httpErrorHandler.extractBackendMessage(error) ??
              'Unable to load the item. Please try again.'
          );
        }
      });
  }

  private resetForm(): void {
    this.submitting.set(false);
    this.submitted.set(false);
    this.generalError.set('');
    this.fieldErrors.set({});
    this.createdItemId.set(null);
    this.imageUploading.set(false);
    this.imageError.set('');
    this.itemImageFileId.set(null);
    this.form.reset();
    this.loading.set(false);
  }

  protected showFieldError(field: FormFieldName): boolean {
    const control = this.form.controls[field];
    return (control.touched || this.submitted()) && control.invalid;
  }

  protected getFieldError(field: FormFieldName): string | null {
    const control = this.form.controls[field];
    const apiError = this.fieldErrors()[field];
    if (!(control.touched || this.submitted())) return null;
    if (apiError) return apiError;
    if (control.hasError('required')) return `${this.fieldLabel(field)} is required.`;
    if (control.hasError('maxlength')) return `${this.fieldLabel(field)} is too long.`;
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

    if (this.submitting()) return;

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

    const categoryId = this.selectedCategoryId();
    if (!categoryId) {
      this.generalError.set('Please select a category.');
      return;
    }

    const request: CreateMenuItemRequest = {
      name: value.name.trim(),
      price,
      description: orNull(value.description),
      currency: this.currency,
      imageFileId: null,
      displayOrder: value.displayOrder.trim().length > 0 ? Number(value.displayOrder) : null,
      isAvailable: value.isAvailable
    };

    this.submitting.set(true);

    const itemForEdit = this.isEdit() ? this.item() : null;

    const save = itemForEdit
      ? this.menuService.updateItem(itemForEdit.id, {
          name: request.name,
          description: request.description,
          price: request.price,
          currency: request.currency,
          imageFileId: null,
          clearImage: false,
          displayOrder: request.displayOrder,
          isAvailable: value.isAvailable
        })
      : this.menuService.createItem(categoryId, request);

    save
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (response: ApiResponse<MenuItemDto>) => {
          if (!response.success || !response.data) {
            this.applyResponseErrors(response);
            return;
          }

          const data = response.data;
          this.notificationService.success(
            this.isEdit() ? 'Item saved.' : 'Menu item created.'
          );
          this.form.markAsPristine();
          this.submitted.set(false);

          if (this.isEdit()) {
            this.itemImageFileId.set(data.imageFileId ?? null);
            this.closeAndSave();
          } else {
            // Create-then-upload: keep modal open so the image can be attached.
            this.createdItemId.set(data.id);
            this.itemImageFileId.set(data.imageFileId ?? null);
          }
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
      if (key && !errors[key]) errors[key] = item.message;
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
      name: 'name', description: 'description', price: 'price',
      currency: 'currency', displayorder: 'displayOrder'
    };
    return map[normalized] ?? null;
  }

  private fieldLabel(field: FormFieldName): string {
    const labels: Record<FormFieldName, string> = {
      name: 'Item name',
      categoryId: 'Category',
      description: 'Description',
      price: 'Price',
      displayOrder: 'Display order'
    };
    return labels[field];
  }

  /* ---------- Image upload ---------- */

  protected onImageUploaded(result: { assetId: string }): void {
    const itemId = this.uploadDestination();
    if (!itemId || !itemId.menuItemId) return;

    this.imageUploading.set(true);
    this.imageError.set('');

    this.menuService
      .updateItem(itemId.menuItemId, {
        imageFileId: result.assetId,
        clearImage: false
      } as UpdateMenuItemRequest)
      .pipe(finalize(() => this.imageUploading.set(false)))
      .subscribe({
        next: response => {
          if (response.success && response.data) {
            this.itemImageFileId.set(response.data.imageFileId ?? null);
            this.imageError.set('');
            if (!this.isEdit()) {
              // Attaching image to a newly created item completes the flow.
              this.closeAndSave();
            }
          } else {
            this.imageError.set(response.message ?? 'Failed to attach the image.');
          }
        },
        error: () => {
          this.imageError.set('Failed to attach the image. Please try again.');
        }
      });
  }

  protected onUploadFailed(): void {
    // uploadFailed is handled by the child component's notification; surface state here.
  }

  protected clearImage(): void {
    const item = this.item();
    if (!this.isEdit() || !item) return;
    this.imageUploading.set(true);
    this.menuService
      .updateItem(item.id, {
        imageFileId: null,
        clearImage: true
      } as UpdateMenuItemRequest)
      .pipe(finalize(() => this.imageUploading.set(false)))
      .subscribe({
        next: response => {
          if (response.success && response.data) {
            this.itemImageFileId.set(null);
            this.imageError.set('');
            this.notificationService.success('Image removed.');
          } else {
            this.imageError.set(response.message ?? 'Failed to remove the image.');
          }
        },
        error: () => {
          this.imageError.set('Failed to remove the image. Please try again.');
        }
      });
  }

  protected imagePreviewUrl(): string {
    return this.item()?.imageUrl || 'https://placehold.co/400x300/f8fafc/64748b?text=Image';
  }

  protected itemCategoryName(): string {
    return this.item()?.categoryName ?? 'Uncategorized';
  }

  /* ---------- Close / done ---------- */

  protected closeAndSave(): void {
    this.saved.emit();
  }

  protected onCancel(): void {
    this.cancelled.emit();
  }

  protected onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement) === event.currentTarget) {
      this.onCancel();
    }
  }
}
