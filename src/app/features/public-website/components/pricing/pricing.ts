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
 * A single pricing plan rendered as a card in the public-website section.
 *
 * NOTE ON DATA INTEGRITY: no official Resto.pk prices, billing periods, or
 * feature limits exist anywhere in this repository (backend, models, docs, or
 * approved product copy). Every `price` / `period` / `features` value below is
 * an ILLUSTRATIVE PLACEHOLDER used only to demonstrate the layout while
 * commercial pricing is still being defined. Each card surfaces a visible
 * "Provisional" badge and the section footer repeats the disclaimer, so these
 * numbers are never presented as genuine Resto.pk pricing. Replace the typed
 * `plans` array with verified data once pricing is approved.
 */
export interface PricingPlan {
  /** Stable key used for `@for` tracking. */
  readonly id: string;
  /** Plan display name (rendered as an `<h3>`). */
  readonly name: string;
  /** One-line summary of who the plan is for. */
  readonly description: string;
  /** Illustrative placeholder price — NOT an official Resto.pk price. */
  readonly price: string;
  /** Billing period shown next to the price — illustrative placeholder. */
  readonly period: string;
  /** Capability list — illustrative placeholder, not a commercial promise. */
  readonly features: readonly string[];
  /** CTA label; every CTA links to the existing /register route. */
  readonly ctaLabel: string;
  /** Whether this card is visually highlighted as recommended. */
  readonly recommended: boolean;
}

/**
 * Public-website "Pricing" section.
 *
 * Three comparison cards (Starter / Professional / Business) built entirely
 * from strongly-typed plan data in this file. The section is informational
 * marketing UI only: no checkout, billing, subscription management, or plan
 * enforcement is implemented here, and none is implied. All CTAs reuse the
 * verified existing `/register` route (the same destination used by the navbar
 * and final-CTA sections) — no invented payment or checkout routes.
 *
 * Entrance animation follows the same SSR-safe pattern as the Features and
 * Testimonials sections: prerendered HTML always shows fully visible cards,
 * and interactive browsers opt into a one-shot IntersectionObserver reveal
 * with a staggered fade-up. If JS never runs, content simply stays visible.
 */
@Component({
  selector: 'app-pricing',
  standalone: true,
  imports: [RouterLink, Button],
  templateUrl: './pricing.html',
  styleUrl: './pricing.css',
})
export class Pricing implements AfterViewInit {
  protected readonly plans: readonly PricingPlan[] = [
    {
      id: 'starter',
      name: 'Starter',
      description: 'For new restaurants launching their first website.',
      price: 'Rs 0',
      period: '/month',
      features: [
        '1 restaurant website',
        'Visual website builder',
        'Mobile responsive design',
        'Basic menu management',
        'Email support',
      ],
      ctaLabel: 'Get started',
      recommended: false,
    },
    {
      id: 'professional',
      name: 'Professional',
      description: 'For growing restaurants that want a stronger brand.',
      price: 'Rs 4,999',
      period: '/month',
      features: [
        'Everything in Starter',
        'Custom branding options',
        'Instant publishing & previews',
        'Advanced menu organisation',
        'Priority support',
      ],
      ctaLabel: 'Start with Professional',
      recommended: true,
    },
    {
      id: 'business',
      name: 'Business',
      description: 'For multi-location restaurants and teams.',
      price: 'Rs 9,999',
      period: '/month',
      features: [
        'Everything in Professional',
        'Multiple restaurants support',
        'Staff accounts & roles',
        'Centralized dashboard',
        'Dedicated support',
      ],
      ctaLabel: 'Choose Business',
      recommended: false,
    },
  ];

  /**
   * Entrance-reveal state for the plan grid. The SSR-prerendered page always
   * shows fully visible cards; in interactive hydrating browsers a one-shot
   * IntersectionObserver (browser-only) hides the cards and reveals them with
   * a staggered fade-up when the section scrolls into view.
   */
  protected readonly revealState = signal<'idle' | 'pending' | 'revealed'>('idle');

  /** Second-phase flag set one frame after `revealed` to trigger the CSS transition. */
  protected readonly cardsIn = signal(false);

  private readonly gridRef = viewChild<ElementRef<HTMLDivElement>>('pricingGrid');

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
          requestAnimationFrame(() => this.cardsIn.set(true));
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    );
    observer.observe(grid);
  }
}
