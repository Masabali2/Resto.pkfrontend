import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PublicOrderFrame } from '../../../components/public-order-frame/public-order-frame';
import { OrderApiService } from '../../../services/order-api.service';
import { HttpErrorHandlerService } from '../../../../core/services/http-error-handler.service';
import type { PublicOrderTracking } from '../../../models/order.models';

@Component({
  selector: 'app-public-order-tracking',
  standalone: true,
  imports: [DatePipe, DecimalPipe, PublicOrderFrame],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './order-tracking.html',
  styleUrl: './order-tracking.css'
})
export class PublicOrderTracking {
  private readonly route = inject(ActivatedRoute);
  private readonly orderApi = inject(OrderApiService);
  private readonly errors = inject(HttpErrorHandlerService);
  protected readonly trackingToken = signal(this.route.snapshot.paramMap.get('trackingToken'));
  protected readonly slug = signal(this.route.snapshot.paramMap.get('slug') ?? '');
  protected readonly order = signal<PublicOrderTracking | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  constructor() {
    const token = this.trackingToken();
    if (token) this.load(token);
    else {
      this.loading.set(false);
      this.error.set('A tracking token is required.');
    }
  }

  protected retry(): void {
    const token = this.trackingToken();
    if (token) this.load(token);
  }

  private load(token: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.orderApi.trackOrder(this.slug(), token).subscribe({
      next: response => {
        this.loading.set(false);
        if (!response.success || !response.data) {
          this.error.set(response.message ?? 'Order could not be found.');
          this.order.set(null);
          return;
        }
        this.order.set(response.data);
      },
      error: error => {
        this.loading.set(false);
        this.error.set(this.errors.handle(error, { fallbackMessage: 'Order could not be found.' }).message);
      }
    });
  }
}
