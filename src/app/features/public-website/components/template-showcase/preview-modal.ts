import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output
} from '@angular/core';
import { Button } from '../../../../shared/components/button/button';
import { TemplateCardModel } from './template-data';

interface ConceptMenuItem {
  name: string;
  price: string;
}

/** Small static sample menus so each concept preview feels real. */
const CONCEPT_MENUS: Record<string, readonly ConceptMenuItem[]> = {
  elegance: [
    { name: 'Seared scallops, brown butter', price: '$32' },
    { name: 'Wagyu tenderloin, truffle jus', price: '$58' },
    { name: 'Chocolate soufflé', price: '$14' }
  ],
  'brew-and-bean': [
    { name: 'Ethiopia Guji pour-over', price: '$5' },
    { name: 'Caramel cold brew', price: '$6' },
    { name: 'Almond croissant', price: '$4' }
  ],
  'flame-grill': [
    { name: 'Double smash burger', price: '$11' },
    { name: 'Char-grilled ribeye stack', price: '$17' },
    { name: 'Loaded grill fries', price: '$7' }
  ],
  'bella-pizza': [
    { name: 'Margherita DOP', price: '$12' },
    { name: 'Diavola piccante', price: '$14' },
    { name: 'Tiramisù della casa', price: '$8' }
  ]
};

/**
 * Accessible dialog that shows a template preview inside the showcase.
 *
 * For Brew & Bean it points visitors at the full interactive mockup rendered
 * below the card grid. For the other templates it renders an honest static
 * "design concept" — it never claims a live restaurant website exists.
 */
@Component({
  selector: 'app-template-preview-modal',
  standalone: true,
  imports: [Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './preview-modal.html',
  styleUrl: './preview-modal.css'
})
export class TemplatePreviewModal {
  readonly template = input.required<TemplateCardModel>();
  readonly closed = output<void>();

  private readonly document = inject(DOCUMENT);

  protected readonly menu = computed<readonly ConceptMenuItem[]>(
    () => CONCEPT_MENUS[this.template().id] ?? []
  );

  /** Focus target is the dialog itself (tabindex="-1"); no timers needed. */
  protected focusDialog(el: HTMLElement): void {
    // Guarded for SSR — only focus in the browser.
    if (typeof el?.focus === 'function') {
      el.focus({ preventScroll: true });
    }
  }

  protected close(): void {
    this.closed.emit();
  }

  /** Escape closes the dialog; wired via (keydown) on the dialog element. */
  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.stopPropagation();
      this.close();
    }
  }

  /** Jump to the interactive Brewed & Co. mockup further down the page. */
  protected openMockup(): void {
    const target = this.document.getElementById('brewed-co-mockup');
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    this.close();
  }
}
