import {
  afterNextRender,
  Component,
  Directive,
  ElementRef,
  NgZone,
  OnDestroy,
  PLATFORM_ID,
  Renderer2,
  inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MarketingStep } from '../../../../shared/models/marketing-step.model';

/**
 * Applies an `inView` CSS class the first time the host element scrolls into
 * view. Purely presentational: content is fully visible when JS is disabled,
 * on the server, or in reduced-motion environments (the scoped CSS neutralises
 * the animation there), so nothing depends on this for correctness.
 */
@Directive({ selector: '[appReveal]', standalone: true })
export class RevealOnScroll implements OnDestroy {
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly renderer = inject(Renderer2);
  private readonly ngZone = inject(NgZone);
  private readonly platformId = inject(PLATFORM_ID);
  private observer?: IntersectionObserver;

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  constructor() {
    afterNextRender(() => {
      // SSR guard: observers only exist in the browser.
      if (!isPlatformBrowser(this.platformId) || typeof IntersectionObserver === 'undefined') {
        return;
      }
      const element = this.elementRef.nativeElement;
      this.observer = this.ngZone.runOutsideAngular(() => {
        const created = new IntersectionObserver(
          entries => {
            for (const entry of entries) {
              if (entry.isIntersecting) {
                this.renderer.addClass(element, 'in-view');
                this.observer?.disconnect();
              }
            }
          },
          { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
        );
        created.observe(element);
        return created;
      });
    });
  }
}

/**
 * Public-website "How It Works" section.
 *
 * Explains the intended Resto.pk product workflow — pick a template,
 * customise the website, then publish it — using three illustrated step
 * cards. The illustrations are self-contained CSS/SVG mockups (no external
 * assets) and all copy stays aspirational ("could look", "intended flow")
 * because live publishing is not yet available in the product.
 */
@Component({
  selector: 'app-how-it-works',
  standalone: true,
  imports: [RevealOnScroll],
  templateUrl: './how-it-works.html',
  styleUrl: './how-it-works.css',
})
export class HowItWorks {
  protected readonly steps: readonly MarketingStep[] = [
    {
      number: 1,
      title: 'Choose Your Template',
      description:
        'Browse professionally designed restaurant templates and choose a look that fits your brand.',
      icon: '🗂️',
      iconLabel: 'Template gallery icon',
      visual: 'template-picker',
    },
    {
      number: 2,
      title: 'Customize Your Website',
      description:
        'Add your restaurant details, menu, photos, and branding to make the website yours.',
      icon: '🎨',
      iconLabel: 'Paint palette icon',
      visual: 'menu-editor',
    },
    {
      number: 3,
      title: 'Launch Your Restaurant Website',
      description:
        'Publish your restaurant website and give customers a convenient way to discover your menu and restaurant information.',
      icon: '🚀',
      iconLabel: 'Rocket launch icon',
      visual: 'device-launch',
    },
  ];

  /** Accessible descriptions for each decorative illustration. */
  protected readonly stepVisualLabels: Record<MarketingStep['visual'], string> = {
    'template-picker': 'Three restaurant website template previews with one selected',
    'menu-editor': 'A menu-editing panel with sample dishes, a photo placeholder and brand color swatches',
    'device-launch': 'A restaurant website shown on a desktop monitor and a mobile phone',
  };
}
