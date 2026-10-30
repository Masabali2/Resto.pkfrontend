import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { MenuCategoryDto } from '../../models/menu-category.model';

type Availability = 'all' | 'available' | 'unavailable';

@Component({
  selector: 'app-menu-management-toolbar',
  standalone: true,
  imports: [
    FormsModule
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
  readonly viewMode = input<'grid' | 'list'>('grid');
  readonly activeDiet = input<string>('all');
  readonly reorderMode = input<boolean>(false);

  readonly searchChange = output<string>();
  readonly categoryChange = output<string | null>();
  readonly availabilityChange = output<Availability>();
  readonly clearFilters = output<void>();
  readonly create = output<void>();
  readonly viewModeChange = output<'grid' | 'list'>();
  readonly dietChange = output<string>();
  readonly toggleReorder = output<void>();

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

  protected onDietClick(diet: string): void {
    this.dietChange.emit(diet);
  }

  protected onViewModeClick(mode: 'grid' | 'list'): void {
    this.viewModeChange.emit(mode);
  }

  protected onToggleReorder(): void {
    this.toggleReorder.emit();
  }

  protected getCategoryIcon(index: number): string {
    const icons = ['bi-fire', 'bi-egg-fried', 'bi-cup-straw', 'bi-cake2', 'bi-basket2', 'bi-cup-hot'];
    return icons[index % icons.length];
  }

  protected onCreate(): void {
    this.create.emit();
  }

  protected categoryLabel(): string {
    const cat = this.selectedCategory();
    return cat ? cat.name : 'All categories';
  }
}
