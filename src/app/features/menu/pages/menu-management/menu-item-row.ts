import {
  ChangeDetectionStrategy,
  Component,
  input,
  output
} from '@angular/core';
import type { MenuItemDto } from '../../models/menu-item.model';
import { formatPrice } from '../../models/menu-price.util';

@Component({
  selector: 'app-menu-item-row',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './menu-item-row.html',
  styleUrl: './menu-item-row.css'
})
export class MenuItemRow {
  readonly item = input.required<MenuItemDto>();
  readonly canManage = input<boolean>(false);
  readonly canDelete = input<boolean>(false);
  readonly readOnly = input<boolean>(false);
  readonly pending = input<boolean>(false);

  readonly edit = output<MenuItemDto>();
  readonly delete = output<MenuItemDto>();
  readonly toggleAvailability = output<MenuItemDto>();

  protected formatMoney(value: number): string {
    return formatPrice(value);
  }

  protected onEdit(): void {
    this.edit.emit(this.item());
  }

  protected onDelete(): void {
    this.delete.emit(this.item());
  }

  protected onToggleAvailability(): void {
    this.toggleAvailability.emit(this.item());
  }
}
