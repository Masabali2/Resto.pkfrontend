
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { MenuService } from '../../services/menu.service';
import { HttpErrorHandlerService } from '../../../../core/services/http-error-handler.service';
import type { MenuItemDto } from '../../models/menu-item.model';
import { formatPrice } from '../../models/menu-price.util';
import {
  BulkPriceForm,
  BulkPriceMode,
  BulkPricePreviewRow,
  BulkPriceResultRow,
  computeAdjustedPrice
} from '../../models/bulk-price-adjustment.model';

@Component({
  selector: 'app-bulk-price-dialog',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bulk-price-dialog.html',
  styleUrl: './bulk-price-dialog.css'
})
export class BulkPriceDialog {
  private readonly menuService = inject(MenuService);
  private readonly httpErrorHandler = inject(HttpErrorHandlerService);

  readonly open = input(false);
  readonly items = input<MenuItemDto[]>([]);
  readonly categoryName = input('');

  readonly closed = output<void>();
  readonly applied = output<BulkPriceResultRow[]>();

  protected readonly mode = signal<BulkPriceMode>('percentage');
  protected readonly percentValue = signal(10);
  protected readonly amountValue = signal(50);
  protected readonly roundToWhole = signal(true);
  protected readonly applying = signal(false);
  protected readonly results = signal<BulkPriceResultRow[] | null>(null);

  protected readonly form = computed<BulkPriceForm>(() => ({
    mode: this.mode(),
    percent: this.percentValue(),
    amount: this.amountValue(),
    roundToWhole: this.roundToWhole()
  }));

  protected readonly previewRows = computed<BulkPricePreviewRow[]>(() =>
    this.items().map(item => ({
      itemId: item.id,
      name: item.name,
      currentPrice: item.price,
      newPrice: computeAdjustedPrice(item.price, this.form()),
      imageFileId: item.imageFileId,
      displayOrder: item.displayOrder
    }))
  );

  protected readonly isValid = computed(() => {
    const value =
      this.mode() === 'percentage' ? this.percentValue() : this.amountValue();

    return Number.isFinite(value) && this.previewRows().length > 0;
  });

  protected setMode(mode: BulkPriceMode): void {
    this.mode.set(mode);
    this.results.set(null);
  }

  protected onPercentChange(value: string): void {
    this.percentValue.set(Number(value));
  }

  protected onAmountChange(value: string): void {
    this.amountValue.set(Number(value));
  }

  protected toggleRound(): void {
    this.roundToWhole.update(v => !v);
  }

  protected close(): void {
    if (this.applying()) {
      return;
    }

    this.results.set(null);
    this.closed.emit();
  }

  protected apply(): void {
    if (!this.isValid() || this.applying()) {
      return;
    }

    this.applying.set(true);

    const requests = this.previewRows().map(row =>
      this.menuService
        .updateItem(row.itemId, {
          price: row.newPrice,
          imageFileId: row.imageFileId,
          clearImage: false,
          displayOrder: row.displayOrder
        })
        .pipe(
          map(response => {
            const ok = response.success && !!response.data;

            return {
              item: row,
              success: ok,
              error: ok ? null : (response.message ?? 'Update failed.')
            } satisfies BulkPriceResultRow;
          }),
          catchError(error =>
            of({
              item: row,
              success: false,
              error:
                this.httpErrorHandler.extractBackendMessage(error) ??
                'Update failed.'
            } satisfies BulkPriceResultRow)
          )
        )
    );

    forkJoin(requests).subscribe(rows => {
      this.results.set(rows);
      this.applying.set(false);

      if (rows.some(r => r.success)) {
        this.applied.emit(rows);
      }
    });
  }

  protected succeededCount(): number {
    return this.results()?.filter(r => r.success).length ?? 0;
  }

  protected failedCount(): number {
    return this.results()?.filter(r => !r.success).length ?? 0;
  }

  protected formatMoney(value: number): string {
    return formatPrice(value);
  }
}
