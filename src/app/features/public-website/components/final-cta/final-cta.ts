import {
  AfterViewInit,
  Component,
  ElementRef,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button } from '../../../../shared/components/button/button';

/**
 * Public-website "Final CTA" section — the closing conversion band that sits
 * after the FAQ and immediately before the footer.
 *
 * Destinations are verified against this repository:
 * - Primary "Get Started" uses the existing lazy `/register` route (the same
 *   destination used by the navbar and hero CTAs).
 * - Secondary "Explore Templates" scrolls to the `#templates` anchor rendered
 *   by the Template Showcase section on this page (same pattern as the hero).
 *
 * No checkout, signup-completion, or template-selection functionality is
 * implied — these are plain navigation links only.
 *
 * The entrance animation follows the same SSR-safe lifecycle as the Features,
 * Testimonials, Pricing, and FAQ sections: prerendered HTML always shows fully
 * visible content; only interactive browsers opt into a one-shot
 * IntersectionObserver fade-up reveal. If JS never runs, content stays visible.
 */
@Component({
  selector: 'app-final-cta',
  standalone: true,
  imports: [RouterLink, Button],
  templateUrl: './final-cta.html',
  styleUrl: './final-cta.css',
})
export class FinalCta implements AfterViewInit {
  /**
   * Entrance-reveal state for the card. The SSR-prerendered page stays in
   * `idle` (fully visible); after hydration, interactive browsers enter
   * `pending` and then play the reveal once the section scrolls into view.
   */
  protected readonly revealState = signal<'idle' | 'pending' | 'revealed'>('idle');

  /** Second-phase flag set one frame after `revealed` to trigger the CSS transition. */
  protected readonly cardIn = signal(false);

  private readonly cardRef = viewChild<ElementRef<HTMLDivElement>>('ctaCard');

  ngAfterViewInit(): void {
    // SSR/hydration guards: browser globals are only touched in interactive
    // browsers, mirroring the sibling sections exactly.
    if (typeof IntersectionObserver !== 'function' || typeof queueMicrotask !== 'function') {
      return;
    }

    // Defer one microtask so Angular first renders/prerenders the visible
    // (`idle`) state before opting into the reveal animation.
    queueMicrotask(() => this.initReveal());
  }

  private initReveal(): void {
    const card = this.cardRef()?.nativeElement;
    if (!card) return;

    this.revealState.set('pending');
    const observer = new IntersectionObserver(
      (entries: IntersectionObserverEntry[]) => {
        if (entries.some(entry => entry.isIntersecting)) {
          this.revealState.set('revealed');
          observer.disconnect();
          requestAnimationFrame(() => this.cardIn.set(true));
        }
      },
      { threshold: 0.2, rootMargin: '0px 0px -8% 0px' },
    );
    observer.observe(card);
  }
}
