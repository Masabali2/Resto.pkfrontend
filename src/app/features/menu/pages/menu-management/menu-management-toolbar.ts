import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from '../../../../shared/components/button/button';
import type { MenuCategoryDto } from '../../models/menu-category.model';

type Availability = 'all' | 'available' | 'unavailable';

@Component({
  selector: 'app-menu-management-toolbar',
  standalone: true,
  imports: [
    FormsModule,
    Button
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './menu-management-toolbar.html',
  styleUrl: './menu-management-toolbar.css'
})
export class MenuManagementToolbar {
  readonly categories = input<MenuCategoryDto[]>([]);
  readonly selectedCategory = input<MenuCategoryDto | null>(null);
  readonly search = input<string>('');
  readonly availability = input<Availability>('all');
  readonly activeFilterCount = input<number>(0);
  readonly totalItems = input<number>(0);
  readonly canCreate = input<boolean>(false);
  readonly readOnly = input<boolean>(false);

  readonly searchChange = output<string>();
  readonly categoryChange = output<string | null>();
  readonly availabilityChange = output<Availability>();
  readonly clearFilters = output<void>();
  readonly create = output<void>();

  protected readonly availabilityOptions: { value: Availability; label: string }[] = [
    { value: 'all', label: 'All statuses' },
    { value: 'available', label: 'Available only' },
    { value: 'unavailable', label: 'Out of stock only' }
  ];

  protected onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchChange.emit(value);
  }

  protected onClearSearch(): void {
    this.searchChange.emit('');
  }

  protected onCategorySelect(categoryId: string | null): void {
    this.categoryChange.emit(categoryId);
  }

  protected onAvailabilitySelect(value: Availability): void {
    this.availabilityChange.emit(value);
  }

  protected onClearFilters(): void {
    this.clearFilters.emit();
  }

  protected onCreate(): void {
    this.create.emit();
  }

  protected categoryLabel(): string {
    const cat = this.selectedCategory();
    return cat ? cat.name : 'All categories';
  }
}
