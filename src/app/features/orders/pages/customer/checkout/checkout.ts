import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PublicOrderFrame } from '../../../components/public-order-frame/public-order-frame';
import { PublicOrderStateService } from '../../../services/public-order-state.service';
import type { OrderType } from '../../../models/order.models';

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
  private readonly publicOrderState = inject(PublicOrderStateService);
  private readonly routeParams = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap
  });

  protected readonly slug = computed(() => this.routeParams().get('slug') ?? '');
  protected readonly cart = this.publicOrderState.cart;
  protected readonly loading = computed(() => this.publicOrderState.cartLoading() || (!this.publicOrderState.cart() && !this.publicOrderState.checkoutMessage()));
  protected readonly submitting = computed(
    () => this.publicOrderState.creatingOrder() || this.publicOrderState.cartMutating()
  );
  protected readonly error = this.publicOrderState.checkoutMessage;

  protected readonly form = this.formBuilder.nonNullable.group({
    customerName: ['', [Validators.required, Validators.maxLength(150)]],
    customerPhone: ['', [Validators.maxLength(30), Validators.pattern(/^\+?[0-9\s\-()]{7,20}$/)]],
    customerEmail: ['', [Validators.email, Validators.maxLength(254)]],
    orderType: ['Pickup' as OrderType, Validators.required],
    specialInstructions: ['', [Validators.maxLength(2000)]]
  });

  constructor() {
    effect(() => {
      const slug = this.slug();
      if (slug) untracked(() => this.publicOrderState.loadCart(slug));
    });
  }

  protected submit(): void {
    const slug = this.slug();

    if (this.form.invalid || !this.cart()?.items.length || this.submitting() || !slug) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();

    this.publicOrderState.createOrder(slug, {
      orderType: value.orderType,
      customerName: value.customerName.trim(),
      customerPhone: value.customerPhone.trim() || null,
      customerEmail: value.customerEmail.trim() || null,
      specialInstructions: value.specialInstructions.trim() || null
    }).subscribe({
      next: response => {
        if (!response.success || !response.data) return;
        this.router.navigate(['/r', slug, 'order-confirmation'], { state: { order: response.data } });
      },
      error: () => undefined
    });
  }
}