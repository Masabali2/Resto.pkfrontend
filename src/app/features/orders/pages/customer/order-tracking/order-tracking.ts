import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PublicOrderFrame } from '../../../components/public-order-frame/public-order-frame';

@Component({
  selector: 'app-public-order-tracking',
  standalone: true,
  imports: [PublicOrderFrame],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './order-tracking.html',
  styleUrl: './order-tracking.css'
})
export class PublicOrderTracking {}
