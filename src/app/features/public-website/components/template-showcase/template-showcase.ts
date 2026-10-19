import { DOCUMENT } from '@angular/common';
import {
  AfterViewInit,
  Component,
  computed,
  ElementRef,
  inject,
  signal,
  viewChild
} from '@angular/core';
import { Router } from '@angular/router';
import { TemplateCard } from './template-card';
import { TemplatePreviewModal } from './preview-modal';
import { TEMPLATE_CARDS, TemplateCardModel } from './template-data';
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
 * Two parts, both scoped to this component folder so they can be replaced by
 * the real template system later:
 * 1. A grid of four animated marketing cards driven by the typed
 *    TEMPLATE_CARDS model. "Preview" opens an in-section dialog (an honest
 *    concept state, or a link to the interactive demo); "Use Template"
 *    navigates to /register via the Angular Router.
 * 2. The existing interactive "Brewed & Co." mockup below the grid, which is
 *    the demo site backing the Brew & Bean card. No cart, checkout or API
 *    calls anywhere — every control is demonstrative only.
 */
@Component({
  selector: 'app-template-showcase',
  standalone: true,
  imports: [TemplateCard, TemplatePreviewModal],
  templateUrl: './template-showcase.html',
  styleUrl: './template-showcase.css'
})
export class TemplateShowcase implements AfterViewInit {
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);

  protected readonly templates = TEMPLATE_CARDS;

  /** Template whose preview dialog is currently open (null = closed). */
  protected readonly previewingTemplate = signal<TemplateCardModel | null>(null);

  /**
   * Entrance-reveal state for the card grid. The SSR-prerendered page always
   * shows fully visible cards; in interactive hydrating browsers a one-shot
   * IntersectionObserver (set up in ngAfterViewInit, browser only) hides the
   * cards and reveals them with a staggered fade-up when the section scrolls
   * into view. If JS never runs, cards simply remain visible.
   */
  protected readonly revealState = signal<'idle' | 'pending' | 'revealed'>('idle');

  private readonly gridRef = viewChild<ElementRef<HTMLDivElement>>('templateGrid');

  ngAfterViewInit(): void {
    // SSR guard: browser globals are only touched when a real window exists.
    if (typeof IntersectionObserver !== 'function') return;

    const grid = this.gridRef()?.nativeElement;
    if (!grid) return;

    this.revealState.set('pending');
    const observer = new IntersectionObserver(
      (entries: IntersectionObserverEntry[]) => {
        if (entries.some(entry => entry.isIntersecting)) {
          this.revealState.set('revealed');
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(grid);
  }

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

  /** Open the in-section preview dialog for a template card. */
  protected openPreview(template: TemplateCardModel): void {
    this.previewingTemplate.set(template);
  }

  protected closePreview(): void {
    this.previewingTemplate.set(null);
  }

  /**
   * "Use Template" simply starts account sign-up. The current onboarding
   * flow does not accept a template identifier, so none is persisted here.
   */
  protected useTemplate(): void {
    void this.router.navigate(['/register']);
  }

  /**
   * Called by the section's reveal host directive once it scrolls into view
   * (no-op placeholder kept simple: cards animate via CSS keyframes on
   * first render; see template-card.css).
   */

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
