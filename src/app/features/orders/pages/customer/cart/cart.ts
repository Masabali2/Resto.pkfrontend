import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PublicOrderFrame } from '../../../components/public-order-frame/public-order-frame';

@Component({
  selector: 'app-public-cart',
  standalone: true,
  imports: [PublicOrderFrame],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cart.html',
  styleUrl: './cart.css'
})
export class PublicCart {}
