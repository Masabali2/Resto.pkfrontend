import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output
} from '@angular/core';
import { LoadingSpinner } from '../../../../shared/components/loading-spinner/loading-spinner';
import type { MenuCategoryDto } from '../../models/menu-category.model';

/**
 * Category lifecycle panel for the Menu Management page.
 *
 * This component is intentionally presentational: it never calls the API and
 * never owns category state. The parent MenuManagement component remains the
 * single owner of category data and performs every create / edit / status /
 * reorder / delete operation through MenuService.
 */
@Component({
  selector: 'app-menu-category-manager',
  standalone: true,
  imports: [LoadingSpinner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './menu-category-manager.html',
  styleUrl: './menu-category-manager.css'
})
export class MenuCategoryManager {
  readonly categories = input<MenuCategoryDto[]>([]);
  readonly selectedCategoryId = input<string | null>(null);
  readonly loading = input<boolean>(false);
  readonly readOnly = input<boolean>(false);
  readonly canCreate = input<boolean>(false);
  readonly canUpdate = input<boolean>(false);
  readonly canDelete = input<boolean>(false);
  readonly canReorder = input<boolean>(false);
  readonly pendingIds = input<ReadonlySet<string>>(new Set<string>());
  readonly reordering = input<boolean>(false);
  readonly error = input<string | null>(null);

  readonly create = output<void>();
  readonly edit = output<MenuCategoryDto>();
  readonly select = output<MenuCategoryDto>();
  readonly toggleActive = output<MenuCategoryDto>();
  readonly delete = output<MenuCategoryDto>();
  readonly moveUp = output<MenuCategoryDto>();
  readonly moveDown = output<MenuCategoryDto>();

  protected readonly activeCount = computed(
    () => this.categories().filter(category => category.isActive).length
  );

  protected isSelected(category: MenuCategoryDto): boolean {
    return this.selectedCategoryId() === category.id;
  }

  protected isPending(category: MenuCategoryDto): boolean {
    return this.pendingIds().has(category.id);
  }

  protected isActionDisabled(category: MenuCategoryDto): boolean {
    return this.readOnly() || this.reordering() || this.isPending(category);
  }

  protected canMoveUp(index: number): boolean {
    return index > 0 && this.canMoveCategory(index);
  }

  protected canMoveDown(index: number): boolean {
    return index < this.categories().length - 1 && this.canMoveCategory(index);
  }

  private canMoveCategory(index: number): boolean {
    const category = this.categories()[index];

    return !!category &&
      this.canReorder() &&
      !this.isActionDisabled(category);
  }

  protected itemCountLabel(category: MenuCategoryDto): string {
    return `${category.itemCount} ${category.itemCount === 1 ? 'item' : 'items'}`;
  }
}
