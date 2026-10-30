import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input
} from '@angular/core';
import { MenuItemSummaryDto } from '../../models/menu-item.model';

interface SummaryCard {
  label: string;
  value: string | number;
  subtitle: string;
  icon: string;
  color: string;
}

@Component({
  selector: 'app-menu-management-summary',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './menu-management-summary.html',
  styleUrl: './menu-management-summary.css'
})
export class MenuManagementSummary {
  readonly summary = input<MenuItemSummaryDto | null>(null);
  readonly totalCount = input<number | null>(null);  protected readonly cards = computed<SummaryCard[]>(() => {
    const s = this.summary();
    const total = s?.totalItems ?? this.totalCount() ?? 0;
    return [
      {
        label: 'Total Items',
        value: total,
        subtitle: 'Across all categories',
        icon: 'bi-ui-checks',
        color: 'var(--color-text)'
      },
      {
        label: 'Available',
        value: s?.availableItems ?? 0,
        subtitle: 'Live on the digital menu',
        icon: 'bi-check-lg',
        color: 'var(--color-success)'
      },
      {
        label: 'Out of Stock',
        value: s?.unavailableItems ?? 0,
        subtitle: 'Hidden from customers',
        icon: 'bi-x-lg',
        color: 'var(--color-danger)'
      },
      {
        label: 'Categories',
        value: s?.categoryCount ?? 0,
        subtitle: 'Menu sections',
        icon: 'bi-folder',
        color: 'var(--resto-orange)'
      }
    ];
  });
}
