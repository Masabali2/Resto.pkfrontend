import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  signal
} from '@angular/core';
import type {
  TemplateRendererMode,
  TemplateSectionType,
  WebsiteTemplateDesignViewModel
} from '../../../../models/website-template-design.model';
import { scrollToTemplateSection } from '../../../../utils/template-section-navigation.util';

interface NavItem {
  label: string;
  target: TemplateSectionType;
}

/**
 * Header section of the generic renderer. The alignment variant comes from
 * the design configuration (`layout.header`).
 *
 * In `full` mode the navigation is functional: links scroll to the section
 * that is actually rendered and the compact layout exposes an accessible
 * menu toggle. Decorative card mode keeps plain labels.
 */
@Component({
  selector: 'app-renderer-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './renderer-header.html',
  styleUrl: './renderer-header.css'
})
export class RendererHeader {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly viewModel = input.required<WebsiteTemplateDesignViewModel>();
  readonly mode = input<TemplateRendererMode>('card');
  readonly brandName = input('Your Restaurant');

  protected readonly navOpen = signal(false);

  protected readonly layout = computed(
    () => this.viewModel().configuration.design.layout.header
  );

  protected readonly navItems = computed<NavItem[]>(() => {
    const enabled = new Set(this.viewModel().sections.map(section => section.type));

    const candidates: NavItem[] = [
      { label: 'Menu', target: 'menu' },
      { label: 'About', target: 'about' },
      { label: 'Gallery', target: 'gallery' },
      { label: 'Contact', target: 'contact' }
    ];

    return candidates.filter(item => enabled.has(item.target));
  });

  protected toggleNav(): void {
    this.navOpen.update(open => !open);
  }

  protected onNavClick(event: Event, target: TemplateSectionType): void {
    if (!scrollToTemplateSection(this.host.nativeElement, target)) {
      return;
    }

    event.preventDefault();
    this.navOpen.set(false);
  }

  protected closeNav(): void {
    this.navOpen.set(false);
  }
}
