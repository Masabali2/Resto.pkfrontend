import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ActiveRestaurantStateService } from '../../../../../core/services/active-restaurant-state.service';
import { OrderStatusBadge } from '../../../components/order-status-badge/order-status-badge';
import { OrderTypeBadge } from '../../../components/order-type-badge/order-type-badge';
import { OrderStatusProgress } from '../../../components/order-status-progress/order-status-progress';
import { OrderWorkflowActions } from '../../../components/order-workflow-actions/order-workflow-actions';
import type { StaffOrderDetails } from '../../../models/order.models';

@Component({
  selector: 'app-order-details',
  standalone: true,
  imports: [DatePipe, DecimalPipe, RouterLink, OrderStatusBadge, OrderTypeBadge, OrderStatusProgress, OrderWorkflowActions],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './order-details.html',
  styleUrl: './order-details.css'
})
export class OrderDetails {
  private readonly route = inject(ActivatedRoute);
  private readonly activeRestaurantState = inject(ActiveRestaurantStateService);

  protected readonly orderId = signal(this.route.snapshot.paramMap.get('orderId'));
  protected readonly restaurant = this.activeRestaurantState.restaurant;
  protected readonly order = signal<StaffOrderDetails | null>(null);
}
