import { DOCUMENT } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import {
  BREWED_CATEGORIES,
  BREWED_GALLERY_IMAGES,
  BREWED_PRODUCTS,
  BREWED_REVIEWS,
  BrewedCategoryId,
  BrewedProduct
} from './brewed-menu-preview';

/**
 * Public-website template showcase.
 *
 * Renders a temporary, self-contained mockup of the "Brewed & Co." specialty
 * coffee house template inside a framed browser preview so visitors can see
 * how a restaurant website built with Resto.pk could look. There is no cart,
 * checkout or backend integration — every control is demonstrative only and
 * images degrade gracefully to styled placeholders if a remote URL fails.
 */
@Component({
  selector: 'app-template-showcase',
  standalone: true,
  templateUrl: './template-showcase.html',
  styleUrl: './template-showcase.css'
})
export class TemplateShowcase {
  private readonly document = inject(DOCUMENT);

  protected readonly categories = BREWED_CATEGORIES;
  protected readonly galleryImages = BREWED_GALLERY_IMAGES;
  protected readonly reviews = BREWED_REVIEWS;

  /** Currently selected demo menu category tab. */
  protected readonly activeCategory = signal<BrewedCategoryId>('coffee');

  /** Product photos that failed to load (keyed by image URL) → emoji fallback. */
  private readonly failedImages = signal<Record<string, boolean>>({});

  protected readonly visibleProducts: () => readonly BrewedProduct[] = computed(() => {
    const active = this.activeCategory();
    return BREWED_PRODUCTS.filter(product => product.category === active);
  });

  protected selectCategory(category: BrewedCategoryId): void {
    this.activeCategory.set(category);
  }

  protected markImageFailed(src: string): void {
    this.failedImages.update(failed => ({ ...failed, [src]: true }));
  }

  protected isImageFailed(src: string): boolean {
    return this.failedImages()[src] === true;
  }

  /**
   * "Order Now" / "View Menu" CTAs in the mockup only scroll between sections
   * of the demo page — they never place an order or call an API.
   */
  protected scrollToMenu(event: Event): void {
    event.preventDefault();
    this.scrollMockupTo('bc-menu');
  }

  /** The demo newsletter form never submits — it only shows a note. */
  protected preventSignup(event: Event): void {
    event.preventDefault();
  }

  protected scrollMockupTo(targetId: string): void {
    const mockup = this.document.getElementById('brewed-co-mockup');
    const target = mockup?.querySelector<HTMLElement>(`#${targetId}`);
    // Guarded for SSR: element scrolling only happens in the browser.
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
