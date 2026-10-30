import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output
} from '@angular/core';
import { MenuItemRow } from './menu-item-row';
import type { MenuItemDto } from '../../models/menu-item.model';
import { formatPrice } from '../../models/menu-price.util';

@Component({
  selector: 'app-menu-item-list',
  standalone: true,
  imports: [MenuItemRow],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './menu-item-list.html',
  styleUrl: './menu-item-list.css'
})
export class MenuItemList {
  readonly items = input<MenuItemDto[]>([]);
  readonly canManage = input<boolean>(false);
  readonly canDelete = input<boolean>(false);
  readonly readOnly = input<boolean>(false);
  readonly pendingIds = input<Set<string>>(new Set());
  readonly viewMode = input<'grid' | 'list'>('grid');

  readonly edit = output<MenuItemDto>();
  readonly delete = output<MenuItemDto>();
  readonly toggleAvailability = output<MenuItemDto>();

  protected readonly empty = computed(() => this.items().length === 0);

  protected formatMoney(value: number): string {
    return formatPrice(value);
  }

  protected isPending(itemId: string): boolean {
    return this.pendingIds().has(itemId);
  }
}
