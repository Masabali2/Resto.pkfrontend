import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** A footer navigation entry. Exactly one destination kind is used per link. */
export interface FooterLink {
  readonly label: string;
  /** In-page anchor id (rendered as `#anchor`) — verified to exist on the homepage. */
  readonly anchor?: string;
  /** Application route (rendered with `routerLink`) — verified in app.routes.ts. */
  readonly route?: string;
}

export interface FooterColumn {
  readonly title: string;
  readonly links: readonly FooterLink[];
}

/**
 * Public-website site footer.
 *
 * Link-integrity policy: every destination below was verified against this
 * repository before being included —
 * - Anchors `features`, `templates`, `pricing`, `how-it-works`, and `faq` are
 *   rendered by their respective homepage sections (`id="..."` present).
 * - Routes `/login` and `/register` exist as lazy routes in `app.routes.ts`.
 * There are NO About/Contact/Support pages, no Privacy Policy or Terms pages,
 * and no verified Resto.pk social-media URLs anywhere in the project, so those
 * groups/links are intentionally omitted rather than invented.
 *
 * The copyright year is computed at construction time via `new Date()`, which
 * is safe under Angular SSR/prerendering (no browser-only globals involved).
 */
@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './footer.html',
  styleUrl: './footer.css',
})
export class Footer {
  readonly currentYear = new Date().getFullYear();

  protected readonly brandDescription =
    'Helping restaurants build their online presence with beautiful, restaurant-focused websites.';

  protected readonly columns: readonly FooterColumn[] = [
    {
      title: 'Product',
      links: [
        { label: 'Features', anchor: 'features' },
        { label: 'Templates', anchor: 'templates' },
        { label: 'Pricing', anchor: 'pricing' },
      ],
    },
    {
      title: 'Resources',
      links: [
        { label: 'How it works', anchor: 'how-it-works' },
        { label: 'FAQ', anchor: 'faq' },
      ],
    },
    {
      title: 'Account',
      links: [
        { label: 'Sign In', route: '/login' },
        { label: 'Get Started', route: '/register' },
      ],
    },
  ];
}
