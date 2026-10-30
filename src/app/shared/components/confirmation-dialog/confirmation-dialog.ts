import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  inject,
  input,
  output,
  viewChild
} from '@angular/core';
import { DOCUMENT } from '@angular/common';

@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './confirmation-dialog.html',
  styleUrl: './confirmation-dialog.css',
  host: {
    '[attr.aria-hidden]': '!open() ? "true" : null'
  }
})
export class ConfirmationDialog {
  private readonly document = inject(DOCUMENT);

  readonly open = input<boolean>(false);
  readonly title = input<string>('Confirm');
  readonly message = input<string>('');
  readonly confirmLabel = input<string>('Confirm');

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  private readonly confirmButton =
    viewChild<ElementRef<HTMLElement>>('confirmButton');
  private readonly cancelButton =
    viewChild<ElementRef<HTMLElement>>('cancelButton');

  constructor() {
    effect(() => {
      if (this.open()) {
        this.trapFocus();
      }
    });
  }

  protected onConfirm(): void {
    this.confirmed.emit();
  }

  protected onCancel(): void {
    this.cancelled.emit();
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.onCancel();
      return;
    }

    if (event.key === 'Tab') {
      event.preventDefault();
      const confirm = this.confirmButton()?.nativeElement;
      const cancel = this.cancelButton()?.nativeElement;
      if (!confirm || !cancel) {
        return;
      }

      if (event.shiftKey) {
        this.document.activeElement === confirm ? cancel.focus() : confirm.focus();
      } else {
        this.document.activeElement === cancel ? confirm.focus() : cancel.focus();
      }
    }
  }

  private trapFocus(): void {
    const confirm = this.confirmButton()?.nativeElement;
    if (confirm) {
      confirm.focus();
    }
  }
}
