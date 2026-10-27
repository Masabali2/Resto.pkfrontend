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
  WebsiteTemplateDesignViewModel
} from '../../../../models/website-template-design.model';
import { scrollToTemplateSection } from '../../../../utils/template-section-navigation.util';

/**
 * Hero section of the generic renderer. Five allow-listed layout variants
 * (`split`, `centered`, `image-led`, `cinematic`, `asymmetric`) drive the
 * composition; the copy comes from the design configuration.
 *
 * In `full` mode the configured primary action behaves like the real site's
 * "view the menu" link: it scrolls to the rendered menu section. When the
 * template has no menu section the action is shown disabled rather than
 * pretending to start an order.
 */
@Component({
  selector: 'app-renderer-hero',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './renderer-hero.html',
  styleUrl: './renderer-hero.css'
})
export class RendererHero {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly viewModel = input.required<WebsiteTemplateDesignViewModel>();
  readonly mode = input<TemplateRendererMode>('card');

  protected readonly layout = computed(
    () => this.viewModel().configuration.design.layout.hero
  );

  protected readonly content = computed(
    () => this.viewModel().configuration.previewContent
  );

  protected readonly hasMenu = computed(
    () => this.viewModel().sections.some(section => section.type === 'menu')
  );

  protected onPrimaryAction(): void {
    scrollToTemplateSection(this.host.nativeElement, 'menu');
  }
}
