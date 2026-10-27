import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input
} from '@angular/core';
import type {
  TemplateRendererMode,
  TemplateSectionType,
  WebsiteTemplateDesignViewModel
} from '../../../../models/website-template-design.model';
import { scrollToTemplateSection } from '../../../../utils/template-section-navigation.util';

interface FooterLink {
  label: string;
  target: TemplateSectionType;
}

/**
 * Footer section of the generic renderer. The arrangement comes from
 * `layout.footer`. In `full` mode its links scroll to the rendered sections,
 * matching the header navigation.
 */
@Component({
  selector: 'app-renderer-footer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './renderer-footer.html',
  styleUrl: './renderer-footer.css'
})
export class RendererFooter {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly viewModel = input.required<WebsiteTemplateDesignViewModel>();
  readonly mode = input<TemplateRendererMode>('card');
  readonly brandName = input('Your Restaurant');

  protected readonly layout = computed(
    () => this.viewModel().configuration.design.layout.footer
  );

  protected readonly links = computed<FooterLink[]>(() => {
    const enabled = new Set(this.viewModel().sections.map(section => section.type));

    const candidates: FooterLink[] = [
      { label: 'Menu', target: 'menu' },
      { label: 'About', target: 'about' },
      { label: 'Gallery', target: 'gallery' },
      { label: 'Contact', target: 'contact' }
    ];

    return candidates.filter(link => enabled.has(link.target));
  });

  protected onLinkClick(event: Event, target: TemplateSectionType): void {
    if (scrollToTemplateSection(this.host.nativeElement, target)) {
      event.preventDefault();
    }
  }
}
