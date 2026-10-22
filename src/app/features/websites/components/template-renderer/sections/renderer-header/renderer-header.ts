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

interface NavItem {
  label: string;
  target: TemplateSectionType;
}

/**
 * Header section of the generic renderer. The alignment variant comes from
 * the design configuration (`layout.header`).
 */
@Component({
  selector: 'app-renderer-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './renderer-header.html',
  styleUrl: './renderer-header.css'
})
export class RendererHeader {
  readonly viewModel = input.required<WebsiteTemplateDesignViewModel>();
  readonly mode = input<TemplateRendererMode>('card');
  readonly brandName = input('Your Restaurant');

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
}
