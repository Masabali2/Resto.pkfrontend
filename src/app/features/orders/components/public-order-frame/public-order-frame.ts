import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { ActivatedRoute, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-public-order-frame',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './public-order-frame.html',
  styleUrl: './public-order-frame.css'
})
export class PublicOrderFrame {
  private readonly route = inject(ActivatedRoute);

  readonly step = input.required<'cart' | 'checkout' | 'confirmation' | 'tracking'>();
  protected readonly slug = this.route.snapshot.paramMap.get('slug') ?? '';
  protected readonly trackingToken = this.route.snapshot.paramMap.get('trackingToken');
}
