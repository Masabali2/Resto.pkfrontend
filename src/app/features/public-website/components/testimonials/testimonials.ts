import {
  AfterViewInit,
  Component,
  ElementRef,
  signal,
  viewChild,
} from '@angular/core';

/** A single illustrative testimonial card in the public-website section. */
export interface TestimonialItem {
  /** Stable key used for `@for` tracking. */
  readonly id: string;
  /** Illustrative customer quote (rendered inside a `<blockquote>`). */
  readonly quote: string;
  /** Illustrative customer name (rendered as an `<h3>`). */
  readonly name: string;
  /** Illustrative restaurant or business type shown under the name. */
  readonly role: string;
  /** Initials rendered inside the decorative avatar circle. */
  readonly initials: string;
}

/**
 * Public-website "Testimonials" section.
 *
 * IMPORTANT — content integrity: no verified customer testimonials exist in
 * this repository yet (the separate OwnerReviews section is still a
 * "Coming soon." placeholder and no approved quotes were found anywhere in
 * the codebase). The three cards below are clearly labelled ILLUSTRATIVE
 * marketing examples only. They do not represent real customers, genuine
 * feedback, ratings, review counts, or success statistics, and nothing here
 * implies such data has been collected or verified. Replace the typed
 * `testimonials` array with approved content once real testimonials exist.
 *
 * The cards are purely informational: no click handlers, no fabricated star
 * ratings, and no platform badges. Avatars and the quotation-mark glyph are
 * decorative and hidden from assistive technology.
 *
 * Entrance animation follows the same SSR-safe pattern as the Features and
 * template showcase sections: prerendered/server HTML always shows fully
 * visible cards, and interactive browsers opt into a one-shot
 * IntersectionObserver reveal with a staggered fade-up. If JS never runs,
 * content simply stays visible.
 */
@Component({
  selector: 'app-testimonials',
  standalone: true,
  templateUrl: './testimonials.html',
  styleUrl: './testimonials.css',
})
export class Testimonials implements AfterViewInit {
  protected readonly testimonials: readonly TestimonialItem[] = [
    {
      id: 'karachi-grill',
      quote:
        'We launched our restaurant website in an afternoon. Guests can finally see the full menu, photos, and our hours before they arrive.',
      name: 'Ayesha Khan',
      role: 'Illustrative example · Family restaurant, Karachi',
      initials: 'AK',
    },
    {
      id: 'lahore-cafe',
      quote:
        'Updating the menu used to take days. Now we change prices and add seasonal dishes right from the dashboard, and the site looks great on every device.',
      name: 'Bilal Ahmed',
      role: 'Illustrative example · Café, Lahore',
      initials: 'BA',
    },
    {
      id: 'islamabad-diner',
      quote:
        'One place for all our branches, menus, and branding. It feels like a website that was designed just for us, without any coding.',
      name: 'Sara Malik',
      role: 'Illustrative example · Diner chain, Islamabad',
      initials: 'SM',
    },
  ];

  /**
   * Entrance-reveal state for the card grid. The SSR-prerendered page always
   * shows fully visible cards; in interactive hydrating browsers a one-shot
   * IntersectionObserver (set up in ngAfterViewInit, browser only) hides the
   * cards and reveals them with a staggered fade-up when the section scrolls
   * into view. If JS never runs, cards simply remain visible.
   */
  protected readonly revealState = signal<'idle' | 'pending' | 'revealed'>('idle');

  /**
   * Second-phase flag: set one frame after `revealed` so the CSS transition
   * has a starting state to animate from (cards fade/slide up in place).
   */
  protected readonly cardsIn = signal(false);

  private readonly gridRef = viewChild<ElementRef<HTMLDivElement>>('testimonialGrid');

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
          // Wait one paint before flipping the "in" state so the staggered
          // transition runs from its hidden start position.
          requestAnimationFrame(() => this.cardsIn.set(true));
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    );
    observer.observe(grid);
  }
}
