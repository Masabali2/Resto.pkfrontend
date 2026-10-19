import {
  AfterViewInit,
  Component,
  ElementRef,
  signal,
  viewChild,
} from '@angular/core';

/**
 * A single FAQ entry rendered as an accordion item.
 *
 * NOTE ON DATA INTEGRITY: Resto.pk is currently a public marketing homepage;
 * the underlying product capabilities (website builder, menu management,
 * multi-restaurant support, publishing workflow) are described in the
 * Features/Pricing sections as intended product scope, not as verified live
 * functionality. Every answer below therefore uses careful "designed to /
 * intended to" wording and never promises behaviour that cannot be
 * substantiated from this repository. No prices, contact channels, emails,
 * phone numbers, or support services are invented anywhere.
 */
export interface FaqItem {
  /** Stable key used for `@for` tracking and for DOM ids. */
  readonly id: string;
  /** Question text (rendered inside the accordion `<button>`). */
  readonly question: string;
  /** Concise answer paragraph(s). */
  readonly answer: string;
}

/**
 * Public-website "FAQ" section.
 *
 * A data-driven, single-open accessible accordion built with native Angular
 * signals — no third-party libraries, timers, extra subscriptions, or direct
 * DOM manipulation. All items start collapsed; toggling one closes the
 * previously open one, and clicking the open one collapses it again.
 *
 * Entrance animation follows the same SSR-safe pattern as the Features,
 * Testimonials, and Pricing sections: prerendered HTML always shows fully
 * visible content, and interactive browsers opt into a one-shot
 * IntersectionObserver reveal with a staggered fade-up. If JS never runs,
 * content simply stays visible.
 */
@Component({
  selector: 'app-faq',
  standalone: true,
  templateUrl: './faq.html',
  styleUrl: './faq.css',
})
export class Faq implements AfterViewInit {
  protected readonly faqItems: readonly FaqItem[] = [
    {
      id: 'what-is-resto-pk',
      question: 'What is Resto.pk?',
      answer:
        'Resto.pk is designed to help restaurants establish an online presence through their own restaurant website. It aims to bring your menu, branding, and restaurant information together in one place so customers can discover and engage with your brand online.',
    },
    {
      id: 'coding-skills',
      question: 'Do I need coding skills to create my restaurant website?',
      answer:
        'No. Resto.pk is intended to let restaurant owners create their website without writing code. The visual tools described on this page are designed so you can assemble and adjust your site yourself, guided step by step.',
    },
    {
      id: 'customization',
      question: 'Can I customize my restaurant website?',
      answer:
        "Yes, customization is part of the product's intended scope. As described in our Features section, Resto.pk is designed around menu management, custom branding such as colors, fonts, and logos, and a visual website builder so your site can reflect your restaurant's identity.",
    },
    {
      id: 'menu-management',
      question: 'Can I manage my restaurant menu online?',
      answer:
        'Menu management is one of the core capabilities Resto.pk is designed for. The plan is to let you organize categories, items, prices, images, and availability from your dashboard, keeping everything in one place.',
    },
    {
      id: 'mobile-support',
      question: 'Will my website work on mobile devices?',
      answer:
        'Yes. Responsive design is part of how Resto.pk websites are built — every website is intended to adapt automatically to desktop, tablet, and mobile screens so your customers get a readable experience on any device.',
    },
    {
      id: 'multiple-restaurants',
      question: 'Can I manage multiple restaurants or branches?',
      answer:
        "Managing multiple locations and branches from a single dashboard is part of Resto.pk's intended product scope, as outlined in our Features section. Detailed branch-specific capabilities will be available as those features roll out.",
    },
    {
      id: 'pricing-cost',
      question: 'How much does Resto.pk cost?',
      answer:
        'Please see the Pricing section above for the current plan overview. The plan names and prices shown there are provisional placeholders while final commercial pricing is being defined — official pricing will be announced before launch.',
    },
    {
      id: 'get-started',
      question: 'How do I get started?',
      answer:
        'You can get started by creating an account through the "Create account" option in the navigation bar, which leads to the existing registration page. Once registered, you can set up your restaurant profile and begin building your website at your own pace.',
    },
    {
      id: 'update-after-publishing',
      question: 'Can I update my restaurant website after publishing it?',
      answer:
        'Yes. Resto.pk is designed around easy updates: you can edit your menu, branding, and website content at any time, preview your changes, and publish them when you are ready — as described in the Instant Publishing feature.',
    },
    {
      id: 'getting-help',
      question: 'How can I get help if I have questions?',
      answer:
        'This FAQ and the other sections of this page cover what Resto.pk is designed to offer. Additional guidance and support options will be shared alongside the product as it becomes available.',
    },
  ];

  /** Index of the currently open item; `null` means all items are collapsed. */
  private readonly openIndex = signal<number | null>(null);

  protected isOpen(index: number): boolean {
    return this.openIndex() === index;
  }

  /** Single-open accordion: opening one item closes the previously open one. */
  protected toggle(index: number): void {
    this.openIndex.update(current => (current === index ? null : index));
  }

  protected panelId(index: number): string {
    return `faq-panel-${this.faqItems[index].id}`;
  }

  protected triggerId(index: number): string {
    return `faq-trigger-${this.faqItems[index].id}`;
  }

  /**
   * Entrance-reveal state for the accordion list. The SSR-prerendered page
   * stays in `idle` (fully visible, no hidden window); only after hydration
   * do interactive browsers enter `pending` and play the reveal — exactly the
   * lifecycle used by the sibling pricing/testimonials sections.
   */
  protected readonly revealState = signal<'idle' | 'pending' | 'revealed'>('idle');

  /** Second-phase flag set one frame after `revealed` to trigger the CSS transition. */
  protected readonly itemsIn = signal(false);

  private readonly listRef = viewChild<ElementRef<HTMLUListElement>>('faqList');

  ngAfterViewInit(): void {
    // SSR/hydration guards: the prerendered page never carries the hidden
    // `pending` class, and browser globals are only touched in interactive
    // browsers — identical lifecycle to the pricing/testimonials sections.
    if (typeof IntersectionObserver !== 'function' || typeof queueMicrotask !== 'function') {
      return;
    }

    // Defer one microtask so Angular first renders/prerenders the visible
    // (`idle`) state before opting into the reveal animation.
    queueMicrotask(() => this.initReveal());
  }

  private initReveal(): void {
    const list = this.listRef()?.nativeElement;
    if (!list) return;

    this.revealState.set('pending');
    const observer = new IntersectionObserver(
      (entries: IntersectionObserverEntry[]) => {
        if (entries.some(entry => entry.isIntersecting)) {
          this.revealState.set('revealed');
          observer.disconnect();
          requestAnimationFrame(() => this.itemsIn.set(true));
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    );
    observer.observe(list);
  }
}
