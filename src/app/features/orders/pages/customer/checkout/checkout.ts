import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PublicOrderFrame } from '../../../components/public-order-frame/public-order-frame';
import { OrderApiService } from '../../../services/order-api.service';
import { HttpErrorHandlerService } from '../../../../core/services/http-error-handler.service';
import type { OrderType, PublicCart } from '../../../models/order.models';

@Component({
  selector: 'app-public-checkout',
  standalone: true,
  imports: [DecimalPipe, PublicOrderFrame, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './checkout.html',
  styleUrl: './checkout.css'
})
export class PublicCheckout {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);
  private readonly orderApi = inject(OrderApiService);
  private readonly errors = inject(HttpErrorHandlerService);

  protected readonly slug = signal(this.route.snapshot.paramMap.get('slug') ?? '');
  protected readonly cart = signal<PublicCart | null>(null);
  protected readonly loading = signal(true);
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.formBuilder.nonNullable.group({
    customerName: ['', [Validators.required, Validators.maxLength(200)]],
    customerPhone: ['', [Validators.maxLength(50)]],
    customerEmail: ['', [Validators.email, Validators.maxLength(320)]],
    orderType: ['Pickup' as OrderType, Validators.required],
    specialInstructions: ['', [Validators.maxLength(2000)]]
  });

  constructor() {
    this.loadCart();
  }

  protected submit(): void {
    if (this.form.invalid || !this.cart()?.items.length || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.error.set(null);
    const value = this.form.getRawValue();

    this.orderApi.createOrder(this.slug(), {
      orderType: value.orderType,
      customerName: value.customerName.trim(),
      customerPhone: value.customerPhone.trim() || null,
      customerEmail: value.customerEmail.trim() || null,
      specialInstructions: value.specialInstructions.trim() || null
    }).subscribe({
      next: response => {
        this.submitting.set(false);
        if (!response.success || !response.data) {
          this.error.set(response.message ?? 'Order could not be created.');
          return;
        }
        this.router.navigate(['/r', this.slug(), 'order-confirmation'], { state: { order: response.data } });
      },
      error: error => {
        this.submitting.set(false);
        this.error.set(this.errors.handle(error, { fallbackMessage: 'Order could not be created.' }).message);
      }
    });
  }

  private loadCart(): void {
    this.loading.set(true);
    this.orderApi.getCart(this.slug()).subscribe({
      next: response => {
        this.loading.set(false);
        if (!response.success || !response.data) {
          this.error.set(response.message ?? 'Cart could not be loaded.');
          return;
        }
        this.cart.set(response.data);
      },
      error: error => {
        this.loading.set(false);
        this.error.set(this.errors.handle(error, { fallbackMessage: 'Cart could not be loaded.' }).message);
      }
    });
  }
}
