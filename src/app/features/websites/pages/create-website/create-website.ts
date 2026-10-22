import {
  computed,
  Component,
  inject,
  signal
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { WebsiteService } from '../../services/website.service';
import { RestaurantService } from '../../../../core/services/restaurant.service';
import { HttpErrorHandlerService } from '../../../../core/services/http-error-handler.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Button } from '../../../../shared/components/button/button';
import { InlineError } from '../../../../shared/components/inline-error/inline-error/inline-error';
import { LoadingSpinner } from '../../../../shared/components/loading-spinner/loading-spinner';
import { TemplateGallery } from '../../components/template-gallery/template-gallery';
import { TemplatePreviewDialog } from '../../components/template-preview-dialog/template-preview-dialog';
import type { ApiResponse } from '../../../../core/models/api-response.model';
import type { ValidationError } from '../../../../core/models/api-response.model';
import type { WebsiteTemplateCatalogueItem } from '../../models/website-template-catalogue.model';
import type { WebsiteTemplateDto } from '../../models/website-template.model';
import type { RestaurantDto, RestaurantsPage } from '../../models/restaurant.model';
import type { CreateWebsiteRequest, WebsiteDto } from '../../models/website.model';
import { buildCatalogueItem } from '../../utils/website-template-catalogue.util';

const SLUG_PATTERN = '^[a-z0-9]+(?:-[a-z0-9]+)*$';

type LoadState = 'loading' | 'ready' | 'error';

interface SectionState<T> {
  state: LoadState;
  items: T[];
  error: string;
}

@Component({
  selector: 'app-create-website',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    Button,
    InlineError,
    LoadingSpinner,
    TemplateGallery,
    TemplatePreviewDialog
  ],
  templateUrl: './create-website.html',
  styleUrl: './create-website.css'
})
export class CreateWebsite {
  private readonly fb = inject(FormBuilder);
  private readonly websiteService = inject(WebsiteService);
  private readonly restaurantService = inject(RestaurantService);
  private readonly notificationService = inject(NotificationService);
  private readonly httpErrorHandler = inject(HttpErrorHandlerService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    slug: ['', [Validators.required, Validators.pattern(SLUG_PATTERN)]]
  });

  protected readonly templates = signal<SectionState<WebsiteTemplateDto>>({
    state: 'loading',
    items: [],
    error: ''
  });
  protected readonly restaurants = signal<SectionState<RestaurantDto>>({
    state: 'loading',
    items: [],
    error: ''
  });

  protected readonly selectedTemplateId = signal<string | null>(null);
  protected readonly selectedRestaurantId = signal<string | null>(null);

  /**
   * Catalogue entries prepared for the gallery (design configuration parsed once).
   * Ordered by the `displayOrder` declared in the design configuration so the
   * curated platform order is preserved, then alphabetically by name.
   */
  protected readonly catalogue = computed<WebsiteTemplateCatalogueItem[]>(() =>
    this.templates()
      .items.map(item => buildCatalogueItem(item))
      .sort(
        (left, right) =>
          left.displayOrder - right.displayOrder ||
          left.template.name.localeCompare(right.template.name)
      )
  );

  /** Template currently shown in the larger preview dialog. */
  protected readonly previewTemplateId = signal<string | null>(null);

  protected readonly previewItem = computed<WebsiteTemplateCatalogueItem | null>(() => {
    const id = this.previewTemplateId();

    if (!id) {
      return null;
    }

    return this.catalogue().find(item => item.template.id === id) ?? null;
  });

  protected readonly submitting = signal(false);
  protected readonly submitted = signal(false);
  protected readonly generalError = signal('');
  protected readonly fieldErrors = signal<Record<string, string>>({});

  protected readonly selectedTemplate = computed(() =>
    this.templates().items.find(item => item.id === this.selectedTemplateId()) ?? null
  );
  protected readonly selectedRestaurant = computed(() =>
    this.restaurants().items.find(item => item.id === this.selectedRestaurantId()) ?? null
  );

  protected readonly canSubmit = computed(
    () =>
      !this.submitting() &&
      this.selectedTemplateId() !== null &&
      this.selectedRestaurantId() !== null &&
      this.form.valid
  );

  constructor() {
    this.loadTemplates();
    this.loadRestaurants();
  }

  protected loadTemplates(): void {
    this.templates.set({ state: 'loading', items: [], error: '' });

    this.websiteService.getTemplates().subscribe({
      next: (response: ApiResponse<WebsiteTemplateDto[]>) => {
        if (!response.success || !response.data) {
          this.templates.set({
            state: 'error',
            items: [],
            error: response.message ?? 'Unable to load templates. Please try again.'
          });
          return;
        }

        this.templates.set({ state: 'ready', items: response.data, error: '' });
      },
      error: (error: unknown) => {
        this.templates.set({
          state: 'error',
          items: [],
          error: this.buildLoadErrorMessage(error, 'Unable to load templates. Please try again.')
        });
      }
    });
  }

  protected loadRestaurants(): void {
    this.restaurants.set({ state: 'loading', items: [], error: '' });

    this.restaurantService.getRestaurants().subscribe({
      next: (response: ApiResponse<RestaurantsPage>) => {
        if (!response.success || !response.data) {
          this.restaurants.set({
            state: 'error',
            items: [],
            error: response.message ?? 'Unable to load restaurants. Please try again.'
          });
          return;
        }

        this.restaurants.set({
          state: 'ready',
          items: response.data.items,
          error: ''
        });

        this.preselectRestaurantFromQuery();
      },
      error: (error: unknown) => {
        this.restaurants.set({
          state: 'error',
          items: [],
          error: this.buildLoadErrorMessage(error, 'Unable to load restaurants. Please try again.')
        });
      }
    });
  }

  /** Selects a template by its catalogue id (the database GUID). */
  protected selectTemplateById(templateId: string): void {
    this.selectedTemplateId.set(templateId);
  }

  /** Opens the larger preview. This never creates a website. */
  protected openPreview(templateId: string): void {
    this.previewTemplateId.set(templateId);
  }

  protected closePreview(): void {
    this.previewTemplateId.set(null);
  }

  /** Applies the previewed design and closes the dialog without submitting. */
  protected applyPreviewedTemplate(): void {
    const item = this.previewItem();

    if (item) {
      this.selectedTemplateId.set(item.template.id);
    }

    this.previewTemplateId.set(null);
  }

  /** Honors /websites/new?restaurantId={guid} from the onboarding flow. */
  private preselectRestaurantFromQuery(): void {
    const restaurantId = this.route.snapshot.queryParamMap.get('restaurantId');

    if (!restaurantId) {
      return;
    }

    if (this.restaurants().items.some(item => item.id === restaurantId)) {
      this.selectedRestaurantId.set(restaurantId);
    }
  }

  protected selectRestaurant(restaurant: RestaurantDto): void {
    this.selectedRestaurantId.set(restaurant.id);
  }

  protected restaurantLocation(restaurant: RestaurantDto): string {
    const parts = [restaurant.city, restaurant.country].filter(
      part => typeof part === 'string' && part.trim().length > 0
    );

    return parts.length > 0 ? parts.join(', ') : '';
  }

  protected showFieldError(field: 'name' | 'slug'): boolean {
    const control = this.form.controls[field];

    return (control.touched || this.submitted()) && control.invalid;
  }

  protected getFieldError(field: 'name' | 'slug'): string | null {
    const control = this.form.controls[field];
    const apiError = this.fieldErrors()[field];

    if (!(control.touched || this.submitted())) {
      return null;
    }

    if (apiError) {
      return apiError;
    }

    if (control.hasError('required')) {
      return field === 'name'
        ? 'Website name is required.'
        : 'A URL slug is required.';
    }

    if (control.hasError('pattern')) {
      return 'Use lowercase letters, numbers, and hyphens only (e.g. bella-bistro).';
    }

    if (control.hasError('maxlength')) {
      return 'Website name must be at most 100 characters.';
    }

    return null;
  }

  protected suggestSlugFromName(): void {
    const slugControl = this.form.controls.slug;

    if (slugControl.dirty) {
      return;
    }

    slugControl.setValue(this.slugify(this.form.controls.name.value));
  }

  protected submit(): void {
    this.submitted.set(true);
    this.generalError.set('');
    this.fieldErrors.set({});

    if (this.submitting()) {
      return;
    }

    const missingSelections: string[] = [];

    if (!this.selectedRestaurantId()) {
      missingSelections.push('a restaurant');
    }

    if (!this.selectedTemplateId()) {
      missingSelections.push('a template');
    }

    if (missingSelections.length > 0 || this.form.invalid) {
      this.form.markAllAsTouched();
      this.generalError.set(
        `Please select ${missingSelections.join(' and ') || 'all required fields'} before creating the website.`
      );
      return;
    }

    const request: CreateWebsiteRequest = {
      restaurantId: this.selectedRestaurantId()!,
      websiteTemplateId: this.selectedTemplateId()!,
      name: this.form.controls.name.value.trim(),
      slug: this.form.controls.slug.value.trim()
    };

    this.submitting.set(true);

    this.websiteService.createWebsite(request)
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (response: ApiResponse<WebsiteDto>) => {
          if (!response.success || !response.data) {
            this.handleApiValidation(response.errors, response.message);
            return;
          }

          this.notificationService.success(
            `Website "${response.data.name}" created. Configure and publish it from its management page.`
          );

          void this.router.navigate(['/websites', response.data.id]);
        },
        error: (error: unknown) => {
          this.handleSubmitError(error);
        }
      });
  }

  private handleSubmitError(error: unknown): void {
    const result = this.httpErrorHandler.handle(error, {
      unauthorizedMessage: 'Your session has expired. Please sign in again.',
      fallbackMessage: 'Unable to create the website. Please try again.'
    });

    this.fieldErrors.set(this.mapFieldErrors(result.fieldErrors));

    const message = result.message || this.firstFieldMessage(result.fieldErrors);

    if (message) {
      this.generalError.set(message);
      this.notificationService.error(message);
    }
  }

  private handleApiValidation(
    errors: ValidationError[] | null,
    message: string | null
  ): void {
    const fieldErrors: Record<string, string> = {};

    for (const item of errors ?? []) {
      const key = this.toFormFieldKey(item.field);

      if (key && !fieldErrors[key]) {
        fieldErrors[key] = item.message;
      }
    }

    this.fieldErrors.set(fieldErrors);

    const general = Object.keys(fieldErrors).length > 0
      ? this.firstFieldMessage(fieldErrors)
      : message ?? 'Unable to create the website. Please try again.';

    if (general) {
      this.generalError.set(general);
      this.notificationService.error(general);
    }
  }

  private firstFieldMessage(fieldErrors: Record<string, string>): string {
    return Object.values(fieldErrors)[0] ?? '';
  }

  private mapFieldErrors(errors: Record<string, string>): Record<string, string> {
    const mapped: Record<string, string> = {};

    for (const [key, value] of Object.entries(errors)) {
      const formKey = this.toFormFieldKey(key);

      if (formKey) {
        mapped[formKey] = value;
      } else {
        mapped[key] = value;
      }
    }

    return mapped;
  }

  private toFormFieldKey(key: string): string | null {
    const normalized = key.replace(/[\s_-]/g, '').toLowerCase();

    if (normalized === 'name' || normalized === 'websitename') {
      return 'name';
    }

    if (normalized === 'slug' || normalized === 'websiteslug') {
      return 'slug';
    }

    if (normalized.startsWith('restaurant')) {
      return 'restaurant';
    }

    if (normalized.startsWith('websiteservice') || normalized.startsWith('template')) {
      return 'template';
    }

    return null;
  }

  private buildLoadErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse && error.status === 403) {
      return this.httpErrorHandler.extractBackendMessage(error)
        ?? 'You do not have permission for this. Check that your account has an active restaurant workspace with website access.';
    }

    return this.httpErrorHandler.handle(error, { fallbackMessage: fallback }).message;
  }

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
