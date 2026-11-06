import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { ActivatedRoute, RouterLink, RouterLinkActive } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';

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
  readonly trackingTokenOverride = input<string | null>(null);
  protected readonly params = toSignal(this.route.paramMap, { initialValue: this.route.snapshot.paramMap });
  protected readonly slug = () => this.params().get('slug') ?? '';
  protected readonly trackingToken = () => this.trackingTokenOverride() ?? this.params().get('trackingToken');
}
