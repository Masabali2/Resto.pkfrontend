import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { TenantService } from '../../../../core/services/tenant.service';
import { TenantContextService } from '../../../../core/services/tenant-context.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { HttpErrorHandlerService } from '../../../../core/services/http-error-handler.service';
import type { ApiResponse } from '../../../../core/models/api-response.model';
import type { CreateTenantRequest, TenantAdminDto } from '../../../../core/models/tenant.model';
import { Button } from '../../../../shared/components/button/button';
import { BackLink } from '../../../../shared/components/back-link/back-link';

function createSlug(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

@Component({
  selector: 'app-workspace-setup',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, Button , BackLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './workspace-setup.html',
  styleUrl: './workspace-setup.css'
})
export class WorkspaceSetup {
  private readonly fb = inject(FormBuilder);
  private readonly tenantService = inject(TenantService);
  private readonly tenantContext = inject(TenantContextService);
  private readonly notificationService = inject(NotificationService);
  private readonly httpErrorHandler = inject(HttpErrorHandlerService);
  private readonly router = inject(Router);

  protected readonly submitting = signal(false);
  protected readonly generalError = signal('');

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
    slug: ['', [
      Validators.required,
      Validators.minLength(3),
      Validators.maxLength(80),
      Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    ]]
  });

  protected updateSlug(): void {
    this.form.controls.slug.setValue(createSlug(this.form.controls.name.value));
    this.form.controls.slug.markAsDirty();
  }

  protected submit(): void {
    this.generalError.set('');

    if (this.submitting()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const request: CreateTenantRequest = {
      name: value.name.trim(),
      slug: value.slug.trim()
    };

    this.submitting.set(true);

    this.tenantService.createTenant(request)
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (response: ApiResponse<TenantAdminDto>) => {
          if (!response.success || !response.data) {
            this.generalError.set(
              response.message ?? 'Workspace could not be created. Please try again.'
            );
            return;
          }

          const createdTenant = response.data;

          this.tenantContext.switchAndRefresh(createdTenant.id).subscribe({
            next: refreshed => {
              if (!refreshed?.success || !refreshed.data) {
                this.generalError.set(
                  'Your workspace was created, but we could not activate it. Please reload the dashboard.'
                );
                this.notificationService.error(this.generalError());
                return;
              }

              this.notificationService.success(
                `${createdTenant.name} workspace created successfully.`
              );

              void this.router.navigate(['/dashboard']);
            },
            error: () => {
              this.generalError.set(
                'Your workspace was created, but we could not activate it. Please reload the dashboard.'
              );
              this.notificationService.error(this.generalError());
            }
          });
        },
        error: (error: unknown) => {
          const details = this.httpErrorHandler.handle(error, {
            unauthorizedMessage: 'Your session has expired. Please sign in again.',
            fallbackMessage: 'Workspace could not be created. Please try again.'
          });

          this.generalError.set(
            details.message ||
            Object.values(details.fieldErrors)[0] ||
            'Workspace could not be created. Please try again.'
          );
        }
      });
  }
}