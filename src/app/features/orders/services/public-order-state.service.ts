import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  EMPTY,
  Observable,
  catchError,
  defer,
  finalize,
  throwError
} from 'rxjs';
import type { ApiResponse } from '../../../core/models/api-response.model';
import { HttpErrorHandlerService } from '../../../core/services/http-error-handler.service';
import type {
  CreatePublicOrderRequest,
  PublicCart,
  PublicOrderCreated,
  PublicOrderTracking
} from '../models/order.models';
import { OrderApiService } from './order-api.service';

@Injectable({ providedIn: 'root' })
export class PublicOrderStateService {
  private readonly orderApi = inject(OrderApiService);
  private readonly errors = inject(HttpErrorHandlerService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly cartSlugState = signal<string | null>(null);
  private readonly cartState = signal<PublicCart | null>(null);
  private readonly cartLoadingState = signal(false);
  private readonly cartMutatingState = signal(false);
  private readonly cartErrorState = signal<string | null>(null);
  private readonly creatingOrderState = signal(false);
  private readonly checkoutErrorState = signal<string | null>(null);

  private readonly trackingSlugState = signal<string | null>(null);
  private readonly trackingOrderState = signal<PublicOrderTracking | null>(null);
  private readonly trackingLoadingState = signal(false);
  private readonly trackingErrorState = signal<string | null>(null);

  private cartRequestId = 0;
  private cartMutationRequestId = 0;
  private checkoutRequestId = 0;
  private trackingRequestId = 0;

  readonly cartSlug = this.cartSlugState.asReadonly();
  readonly cart = this.cartState.asReadonly();
  readonly cartLoading = this.cartLoadingState.asReadonly();
  readonly cartMutating = this.cartMutatingState.asReadonly();
  readonly cartError = this.cartErrorState.asReadonly();
  readonly creatingOrder = this.creatingOrderState.asReadonly();
  readonly checkoutError = this.checkoutErrorState.asReadonly();
  readonly checkoutMessage = computed(
    () => this.checkoutErrorState() ?? this.cartErrorState()
  );

  readonly trackingSlug = this.trackingSlugState.asReadonly();
  readonly trackingOrder = this.trackingOrderState.asReadonly();
  readonly trackingLoading = this.trackingLoadingState.asReadonly();
  readonly trackingError = this.trackingErrorState.asReadonly();

  loadCart(slug: string, forceRefresh = false): void {
    this.ensureCartScope(slug);

    if (this.cartMutatingState()) return;
    if (this.cartLoadingState() && !forceRefresh) return;
    if (this.cartState() && !forceRefresh) return;

    if (forceRefresh) {
      this.cartRequestId++;
      this.cartLoadingState.set(false);
    }

    const requestId = ++this.cartRequestId;
    this.cartLoadingState.set(true);
    this.cartErrorState.set(null);

    this.orderApi.getCart(slug).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: response => {
        if (requestId !== this.cartRequestId) return;

        this.cartLoadingState.set(false);

        if (!response.success || !response.data) {
          this.cartState.set(null);
          this.cartErrorState.set(response.message ?? 'Cart could not be loaded.');
          return;
        }

        this.cartState.set(response.data);
      },
      error: error => {
        if (requestId !== this.cartRequestId) return;

        this.cartLoadingState.set(false);
        this.cartState.set(null);
        this.cartErrorState.set(
          this.errors.handle(error, { fallbackMessage: 'Cart could not be loaded.' }).message
        );
      }
    });
  }

  refreshCart(slug: string): void {
    this.loadCart(slug, true);
  }

  addCartItem(slug: string, menuItemId: string, quantity: number): void {
    this.mutateCart(
      slug,
      () => this.orderApi.addCartItem(slug, menuItemId, quantity),
      'Cart item could not be added.'
    );
  }

  updateCartItem(slug: string, itemId: string, quantity: number): void {
    this.mutateCart(
      slug,
      () => this.orderApi.updateCartItem(slug, itemId, quantity),
      'Cart item could not be updated.'
    );
  }

  removeCartItem(slug: string, itemId: string): void {
    this.mutateCart(
      slug,
      () => this.orderApi.removeCartItem(slug, itemId),
      'Cart item could not be removed.'
    );
  }

  clearCart(slug: string): void {
    this.mutateCart(
      slug,
      () => this.orderApi.clearCart(slug),
      'Cart could not be cleared.'
    );
  }

  createOrder(
    slug: string,
    request: CreatePublicOrderRequest
  ): Observable<ApiResponse<PublicOrderCreated>> {
    return defer(() => {
      this.ensureCartScope(slug);

      if (this.creatingOrderState()) return EMPTY;

      const requestId = ++this.checkoutRequestId;
      this.creatingOrderState.set(true);
      this.checkoutErrorState.set(null);

      return this.orderApi.createOrder(slug, request).pipe(
        tapResponse => {
          if (requestId !== this.checkoutRequestId) return;

          if (tapResponse.success && tapResponse.data) {
            this.cartState.set(null);
            this.cartLoadingState.set(false);
            this.cartErrorState.set(null);
          } else {
            this.checkoutErrorState.set(
              tapResponse.message ?? 'Order could not be created.'
            );
          }
        },
        catchError(error => {
          if (requestId === this.checkoutRequestId) {
            this.checkoutErrorState.set(
              this.errors.handle(error, { fallbackMessage: 'Order could not be created.' }).message
            );
          }

          return throwError(() => error);
        }),
        finalize(() => {
          if (requestId === this.checkoutRequestId) {
            this.creatingOrderState.set(false);
          }
        })
      );
    });
  }

  loadTracking(slug: string, trackingToken: string): void {
    this.trackingSlugState.set(slug);

    const requestId = ++this.trackingRequestId;
    this.trackingLoadingState.set(true);
    this.trackingErrorState.set(null);
    this.trackingOrderState.set(null);

    this.orderApi.trackOrder(slug, trackingToken).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: response => {
        if (requestId !== this.trackingRequestId) return;

        this.trackingLoadingState.set(false);

        if (!response.success || !response.data) {
          this.trackingOrderState.set(null);
          this.trackingErrorState.set(response.message ?? 'Order could not be found.');
          return;
        }

        this.trackingOrderState.set(response.data);
      },
      error: error => {
        if (requestId !== this.trackingRequestId) return;

        this.trackingLoadingState.set(false);
        this.trackingOrderState.set(null);
        this.trackingErrorState.set(
          this.errors.handle(error, { fallbackMessage: 'Order could not be found.' }).message
        );
      }
    });
  }

  setTrackingError(message: string): void {
    this.trackingRequestId++;
    this.trackingLoadingState.set(false);
    this.trackingOrderState.set(null);
    this.trackingErrorState.set(message);
  }

  private mutateCart<T>(
    slug: string,
    request: () => Observable<ApiResponse<T>>,
    fallbackMessage: string
  ): void {
    this.ensureCartScope(slug);

    if (this.cartMutatingState() || this.creatingOrderState()) return;

    const requestId = ++this.cartMutationRequestId;
    this.cartMutatingState.set(true);
    this.cartErrorState.set(null);

    request().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: response => {
        if (requestId !== this.cartMutationRequestId) return;

        this.cartMutatingState.set(false);

        if (!response.success) {
          this.cartErrorState.set(response.message ?? fallbackMessage);
          return;
        }

        this.loadCart(slug, true);
      },
      error: error => {
        if (requestId !== this.cartMutationRequestId) return;

        this.cartMutatingState.set(false);
        this.cartErrorState.set(
          this.errors.handle(error, { fallbackMessage }).message
        );
      }
    });
  }

  private ensureCartScope(slug: string): void {
    if (this.cartSlugState() === slug) return;

    this.cartSlugState.set(slug);
    this.cartRequestId++;
    this.cartMutationRequestId++;
    this.checkoutRequestId++;
    this.cartState.set(null);
    this.cartLoadingState.set(false);
    this.cartMutatingState.set(false);
    this.cartErrorState.set(null);
    this.creatingOrderState.set(false);
    this.checkoutErrorState.set(null);
  }
}