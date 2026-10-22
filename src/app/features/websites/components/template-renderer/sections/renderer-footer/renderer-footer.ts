import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input
} from '@angular/core';
import type {
  TemplateRendererMode,
  TemplateSectionType,
  WebsiteTemplateDesignViewModel
} from '../../../../models/website-template-design.model';

interface FooterLink {
  label: string;
  target: TemplateSectionType;
}

/**
 * Footer section of the generic renderer. The arrangement comes from
 * `layout.footer`.
 */
@Component({
  selector: 'app-renderer-footer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './renderer-footer.html',
  styleUrl: './renderer-footer.css'
})
export class RendererFooter {
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
}
