import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  viewChild
} from '@angular/core';
import { TemplateRenderer } from '../template-renderer/template-renderer';
import type { WebsiteTemplateDesignViewModel } from '../../models/website-template-design.model';
import type { WebsiteTemplateDto } from '../../models/website-template.model';

/**
 * Accessible preview dialog for a single catalogue template.
 *
 * It renders the same generic renderer as the catalogue card, but in the
 * larger `full` mode. It never performs a write request and never submits
 * the website form: "Use this template" only reports the user's intent so
 * the parent page can update its selection.
 */
@Component({
  selector: 'app-template-preview-dialog',
  standalone: true,
  imports: [TemplateRenderer],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './template-preview-dialog.html',
  styleUrl: './template-preview-dialog.css'
})
export class TemplatePreviewDialog {
  readonly template = input.required<WebsiteTemplateDto>();
  readonly design = input<WebsiteTemplateDesignViewModel | null>(null);
  readonly designError = input<string | null>(null);

  readonly closed = output<void>();
  readonly useTemplate = output<void>();

  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  private restoreFocusTo: HTMLElement | null = null;
  private previousBodyOverflow = '';

  protected readonly titleId = computed(
    () => `template-preview-title-${this.template().id}`
  );
  protected readonly category = computed(
    () => this.design()?.configuration.category ?? ''
  );

  constructor() {
    afterNextRender(() => {
      this.restoreFocusTo =
        typeof document !== 'undefined'
          ? (document.activeElement as HTMLElement | null)
          : null;

      this.previousBodyOverflow = this.document.body.style.overflow;
      this.document.body.style.overflow = 'hidden';

      this.panel()?.nativeElement.focus({ preventScroll: true });
    });

    this.destroyRef.onDestroy(() => {
      this.document.body.style.overflow = this.previousBodyOverflow;
      this.restoreFocusTo?.focus?.({ preventScroll: true });
    });
  }

  protected close(): void {
    this.closed.emit();
  }

  protected use(): void {
    this.useTemplate.emit();
  }

  protected onBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.stopPropagation();
      this.close();
    }
  }
}
