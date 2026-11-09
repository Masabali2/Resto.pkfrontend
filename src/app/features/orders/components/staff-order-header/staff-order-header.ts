
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal
} from '@angular/core';

import { Button } from '../../../../shared/components/button/button';

export type StaffOrderViewMode = 'kanban' | 'table';

@Component({
  selector: 'app-staff-order-header',
  standalone: true,
  imports: [Button],
  templateUrl: './staff-order-header.html',
  styleUrl: './staff-order-header.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StaffOrderHeader {
  // Restaurant information
  readonly restaurantName = input.required<string>();
  readonly logoUrl = input<string | null>(null);
  readonly currency = input<string | null>(null);

  // Header state
  readonly searchTerm = input('');
  readonly viewMode = input<StaffOrderViewMode>('table');

  // Events
  readonly searchChange = output<string>();
  readonly viewModeChange = output<StaffOrderViewMode>();
  readonly createOrder = output<void>();

  protected readonly logoLoadFailed = signal(false);

  protected readonly restaurantInitials = computed(() => {
    const name = this.restaurantName().trim();

    if (!name) {
      return 'R';
    }

    return name
      .split(/\s+/)
      .slice(0, 2)
      .map(part => part.charAt(0).toUpperCase())
      .join('');
  });

  protected onSearchInput(event: Event): void {
    const element = event.target as HTMLInputElement;
    this.searchChange.emit(element.value);
  }

  protected selectView(mode: StaffOrderViewMode): void {
    if (mode === this.viewMode()) {
      return;
    }

    this.viewModeChange.emit(mode);
  }

  protected onLogoError(): void {
    this.logoLoadFailed.set(true);
  }

  protected onCreateOrder(): void {
    this.createOrder.emit();
  }
}
