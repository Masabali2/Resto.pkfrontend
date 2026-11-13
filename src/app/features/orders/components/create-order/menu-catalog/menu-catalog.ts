import {
  ChangeDetectionStrategy,
  Component,
  input,
  output
} from '@angular/core';
import { CommonModule } from '@angular/common';

import type {
  StaffCreateOrderItem
} from '../../../models/order.models';

@Component({
  selector: 'app-menu-catalog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './menu-catalog.html',
  styleUrl: './menu-catalog.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MenuCatalog {
  readonly items = input<StaffCreateOrderItem[]>([]);
  readonly loading = input(false);

  readonly itemSelected =
    output<StaffCreateOrderItem>();

  protected selectItem(
    item: StaffCreateOrderItem
  ): void {
    if (
      !item.isActive ||
      !item.isAvailable
    ) {
      return;
    }

    this.itemSelected.emit(item);
  }
}