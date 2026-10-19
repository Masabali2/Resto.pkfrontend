import {
  AfterViewInit,
  Component,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';

/** Identifies which inline SVG icon a feature card renders. */
export type FeatureIconName =
  | 'website-builder'
  | 'menu-management'
  | 'custom-branding'
  | 'multiple-restaurants'
  | 'mobile-responsive'
  | 'instant-publishing'
  | 'staff-management'
  | 'centralized-dashboard';

/** A single marketing feature card shown in the Features section. */
export interface FeatureItem {
  /** Stable key used for `@for` tracking and icon selection. */
  readonly id: string;
  /** Selects the inline SVG rendered inside the icon tile. */
  readonly icon: FeatureIconName;
  /** Short, scannable feature title (rendered as an `<h3>`). */
  readonly title: string;
  /** One-sentence supporting description. */
  readonly description: string;
}

/**
 * Public-website "Features" section.
 *
 * Presents eight aspirational Resto.pk product capabilities as static,
 * informational cards — this is a marketing overview only. None of the
 * described functionality (website builder, publishing workflow, staff
 * permissions, etc.) is wired up here, so the cards intentionally have no
 * click handlers or interactive controls.
 *
 * Entrance animation follows the same SSR-safe pattern as the template
 * showcase: prerendered/server HTML always shows fully visible cards, and
 * interactive browsers opt into a one-shot IntersectionObserver reveal with
 * a staggered fade-up. If JS never runs, content simply stays visible.
 */
@Component({
  selector: 'app-features',
  standalone: true,
  templateUrl: './features.html',
  styleUrl: './features.css',
})
export class Features implements AfterViewInit {
  protected readonly features: readonly FeatureItem[] = [
    {
      id: 'visual-website-builder',
      icon: 'website-builder',
      title: 'Visual Website Builder',
      description:
        'Drag-and-drop editor to build your perfect restaurant website without coding.',
    },
    {
      id: 'menu-management',
      icon: 'menu-management',
      title: 'Menu Management',
      description:
        'Organize categories, items, prices, images, and availability in one place.',
    },
    {
      id: 'custom-branding',
      icon: 'custom-branding',
      title: 'Custom Branding',
      description:
        'Configure colors, fonts, and logos to match your restaurant identity.',
    },
    {
      id: 'multiple-restaurants',
      icon: 'multiple-restaurants',
      title: 'Multiple Restaurants',
      description: 'Manage multiple locations and branches from a single dashboard.',
    },
    {
      id: 'mobile-responsive',
      icon: 'mobile-responsive',
      title: 'Mobile Responsive',
      description:
        'Every website automatically adapts to desktop, tablet, and mobile.',
    },
    {
      id: 'instant-publishing',
      icon: 'instant-publishing',
      title: 'Instant Publishing',
      description: 'Preview changes and publish your website with a single click.',
    },
    {
      id: 'staff-management',
      icon: 'staff-management',
      title: 'Staff Management',
      description:
        'Invite team members and assign roles with granular permissions.',
    },
    {
      id: 'centralized-dashboard',
      icon: 'centralized-dashboard',
      title: 'Centralized Dashboard',
      description:
        'Monitor all your restaurants, menus, and websites from one place.',
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

  private readonly gridRef = viewChild<ElementRef<HTMLDivElement>>('featureGrid');

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
