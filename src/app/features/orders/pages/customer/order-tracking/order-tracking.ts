import { DatePipe, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  untracked
} from '@angular/core';
import { DestroyRef } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { PublicOrderFrame } from '../../../components/public-order-frame/public-order-frame';
import { PublicOrderStateService } from '../../../services/public-order-state.service';

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
  private readonly destroyRef = inject(DestroyRef);
  private readonly publicOrderState = inject(PublicOrderStateService);
  private readonly routeParams = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap
  });

  protected readonly trackingToken = computed(() => this.routeParams().get('trackingToken'));
  protected readonly slug = computed(() => this.routeParams().get('slug') ?? '');
  protected readonly order = this.publicOrderState.trackingOrder;
  protected readonly loading = this.publicOrderState.trackingLoading;
  protected readonly error = this.publicOrderState.trackingError;

  constructor() {
    this.destroyRef.onDestroy(() => this.publicOrderState.disconnectTracking());

    effect(() => {
      const slug = this.slug();
      const token = this.trackingToken();

      if (slug && token) {
        untracked(() => this.publicOrderState.loadTracking(slug, token));
      } else {
        untracked(() => this.publicOrderState.setTrackingError('A tracking token is required.'));
      }
    });
  }

  protected retry(): void {
    const slug = this.slug();
    const token = this.trackingToken();
    if (slug && token) this.publicOrderState.loadTracking(slug, token);
  }
}