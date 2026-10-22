import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal
} from '@angular/core';
import { TemplatePickerCard } from '../template-picker-card/template-picker-card';
import type { WebsiteTemplateCatalogueItem } from '../../models/website-template-catalogue.model';

const ALL_CATEGORIES = 'All designs';

/**
 * Presentational gallery of the template catalogue.
 *
 * It owns only view state (the search term and the active category filter)
 * and emits intents. It performs no HTTP calls, navigates nowhere and never
 * creates a website — the parent page owns the selection.
 */
@Component({
  selector: 'app-template-gallery',
  standalone: true,
  imports: [TemplatePickerCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './template-gallery.html',
  styleUrl: './template-gallery.css'
})
export class TemplateGallery {
  readonly items = input<readonly WebsiteTemplateCatalogueItem[]>([]);
  readonly selectedId = input<string | null>(null);
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  /** Resolved preview image URL, when a real asset is available. */
  readonly previewImageUrl = input<string | null>(null);

  readonly select = output<string>();
  readonly preview = output<string>();
  readonly retry = output<void>();

  protected readonly searchTerm = signal('');
  protected readonly activeCategory = signal<string | null>(null);

  protected readonly categories = computed(() => {
    const seen = new Set<string>();

    for (const item of this.items()) {
      if (item.category) {
        seen.add(item.category);
      }
    }

    return [ALL_CATEGORIES, ...Array.from(seen).sort((a, b) => a.localeCompare(b))];
  });

  protected readonly filteredItems = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const category = this.activeCategory();

    return this.items().filter(item => {
      if (category && category !== ALL_CATEGORIES && item.category !== category) {
        return false;
      }

      if (!term) {
        return true;
      }

      return item.searchHaystack.includes(term);
    });
  });

  protected readonly hasActiveFilters = computed(
    () => this.searchTerm().trim().length > 0 || this.activeCategory() !== null
  );

  protected readonly resultLabel = computed(() => {
    const count = this.filteredItems().length;
    const total = this.items().length;

    if (count === total) {
      return `${total} design${total === 1 ? '' : 's'} available`;
    }

    return `${count} of ${total} designs match`;
  });

  protected onSearch(event: Event): void {
    const target = event.target as HTMLInputElement | null;

    this.searchTerm.set(target?.value ?? '');
  }

  protected selectCategory(category: string): void {
    this.activeCategory.set(category === ALL_CATEGORIES ? null : category);
  }

  protected clearFilters(): void {
    this.searchTerm.set('');
    this.activeCategory.set(null);
  }

  protected isCategoryActive(category: string): boolean {
    const active = this.activeCategory();

    return category === ALL_CATEGORIES ? active === null : active === category;
  }
}
