import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal
} from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { MenuService } from '../../../menu/services/menu.service';
import { brandingFontClass } from '../../models/branding-assets.models';
import type { BrandingTheme, BrandingTypography, HeroLayout } from '../../models/branding-assets.models';
import type { MenuCategoryDto } from '../../../menu/models/menu-category.model';
import type { MenuItemDto } from '../../../menu/models/menu-item.model';

@Component({
  selector: 'app-website-preview-modal',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './website-preview-modal.html',
  styleUrl: './website-preview-modal.css'
})
export class WebsitePreviewModal {
  private readonly menuService = inject(MenuService);

  readonly restaurant = input<{ id: string; name: string } | null>(null);
  readonly logoUrl = input<string>('');
  readonly heroBannerUrl = input<string>('');
  readonly theme = input<BrandingTheme>({ primary: '#F97316', secondary: '#0F172A', tint: '#FFF7ED' });
  readonly typography = input<BrandingTypography>({
    headingFont: 'plus-jakarta-sans',
    bodyFont: 'plus-jakarta-sans',
    fontScale: 100
  });
  readonly heroLayout = input<HeroLayout>('split');

  readonly close = output<void>();

  readonly open = input<boolean>(false);
  readonly previewOpen = signal<boolean>(false);
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  readonly categories = signal<MenuCategoryDto[]>([]);
  readonly items = signal<MenuItemDto[]>([]);
  readonly activeCategoryId = signal<string | null>(null);

  readonly headingFontClass = computed(() => brandingFontClass(this.typography().headingFont as any));
  readonly bodyFontClass = computed(() => brandingFontClass(this.typography().bodyFont as any));
  readonly previewScale = computed(() => this.typography().fontScale / 100);

  readonly groupedItems = computed(() => {
    const byCategory = new Map<string, MenuItemDto[]>();
    for (const item of this.items()) {
      const list = byCategory.get(item.menuCategoryId) ?? [];
      list.push(item);
      byCategory.set(item.menuCategoryId, list);
    }
    return byCategory;
  });

  readonly restaurantSlug = computed(() => {
    const name = this.restaurant()?.name ?? 'restaurant';
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'restaurant';
  });

  constructor() {
    effect(() => {
      if (this.open()) {
        this.previewOpen.set(true);
        document.body.style.overflow = 'hidden';
        this.loadPreviewData();
      } else {
        this.previewOpen.set(false);
        document.body.style.overflow = '';
      }
    });
  }

  closePreview(): void {
    this.previewOpen.set(false);
    this.close.emit();
  }

  private loadPreviewData(): void {
    const restaurantId = this.restaurant()?.id;
    if (!restaurantId) {
      this.error.set('No restaurant is selected for preview.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.menuService
      .getMenus(restaurantId, 1, 20)
      .pipe(
        switchMap(response => {
          if (!response.success || !response.data?.items?.length) {
            this.categories.set([]);
            this.items.set([]);
            this.loading.set(false);
            return of(null);
          }
          const menu = response.data.items[0];
          return forkJoin({
            categories: this.menuService.getCategories(menu.id).pipe(
              map(r => r.success ? (r.data ?? []) : []),
              catchError(() => of([] as MenuCategoryDto[]))
            ),
            items: this.menuService.getMenuItems(menu.id, 1, 50).pipe(
              map(r => r.success ? (r.data?.items ?? []) : []),
              catchError(() => of([] as MenuItemDto[]))
            )
          });
        }),
        catchError(err => {
          this.error.set(err instanceof Error ? err.message : 'Failed to load preview content.');
          this.loading.set(false);
          return of(null);
        })
      )
      .subscribe(result => {
        if (result) {
          this.categories.set(result.categories);
          this.items.set(result.items);
          if (this.categories().length) {
            this.activeCategoryId.set(this.categories()[0].id);
          }
        }
        this.loading.set(false);
      });
  }

  protected visibleItems(): MenuItemDto[] {
    const categoryId = this.activeCategoryId();
    if (!categoryId) {
      return this.items();
    }
    return this.items().filter(item => item.menuCategoryId === categoryId);
  }

  protected categoryName(categoryId: string): string {
    return this.categories().find(c => c.id === categoryId)?.name ?? 'Category';
  }

  protected formatPrice(price: number, currency: string): string {
    return `${currency === 'PKR' ? 'PKR' : currency} ${price.toLocaleString()}`;
  }
}
