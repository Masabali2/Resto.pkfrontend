import {
  ChangeDetectionStrategy,
  Component,
  input
} from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-create-order-header',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './create-order-header.html',
  styleUrl: './create-order-header.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CreateOrderHeader {
  readonly restaurantName = input.required<string>();
}