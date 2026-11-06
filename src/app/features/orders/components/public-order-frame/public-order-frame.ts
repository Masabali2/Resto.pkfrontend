import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-public-order-frame',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './public-order-frame.html',
  styleUrl: './public-order-frame.css'
})
export class PublicOrderFrame {
  readonly step = input.required<'cart' | 'checkout' | 'confirmation' | 'tracking'>();
}
