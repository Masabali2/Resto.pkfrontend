import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DecimalPipe, isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PublicOrderFrame } from '../../../components/public-order-frame/public-order-frame';
import type { PublicOrderCreated } from '../../../models/order.models';

@Component({
  selector: 'app-public-order-confirmation',
  standalone: true,
  imports: [DecimalPipe, RouterLink, PublicOrderFrame],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './order-confirmation.html',
  styleUrl: './order-confirmation.css'
})
export class PublicOrderConfirmation {
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  protected readonly slug = signal(this.router.url.split('/')[2] ? decodeURIComponent(this.router.url.split('/')[2]) : '');
  protected readonly order = signal<PublicOrderCreated | null>(
    isPlatformBrowser(this.platformId) ? (history.state?.order as PublicOrderCreated | undefined) ?? null : null
  );
}
