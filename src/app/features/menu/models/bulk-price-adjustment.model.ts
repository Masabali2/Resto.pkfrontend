/**
 * Shared contract for the Bulk Price Adjustment dialog.
 *
 * The backend exposes no bulk endpoint, so the dialog fans out individual
 * PUT /api/v1/menu-items/{itemId} calls (see MenuService.updateItem) and
 * reports per-item results with this model.
 */

export type BulkPriceMode = 'percentage' | 'fixed';

export interface BulkPriceForm {
  mode: BulkPriceMode;
  /** Percentage value (e.g. 10 = +10%) when mode is 'percentage'. */
  percent: number;
  /** Absolute amount added to each price when mode is 'fixed'. */
  amount: number;
  roundToWhole: boolean;
}

export interface BulkPricePreviewRow {
  itemId: string;
  name: string;
  currentPrice: number;
  newPrice: number;
  /** Current image reference, preserved verbatim by the PUT partial update. */
  imageFileId: string | null;
  /** Current position in the category, preserved verbatim by the PUT partial update. */
  displayOrder: number;
}

export interface BulkPriceResultRow {
  item: BulkPricePreviewRow;
  success: boolean;
  error: string | null;
}

/**
 * Computes the adjusted price for a single item.
 * Money on the backend is decimal(18,2), so results are clamped to >= 0.01
 * and rounded to two fraction digits unless whole-number rounding is asked.
 */
export function computeAdjustedPrice(
  currentPrice: number,
  form: BulkPriceForm
): number {
  const raw =
    form.mode === 'percentage'
      ? currentPrice * (1 + form.percent / 100)
      : currentPrice + form.amount;

  const rounded = form.roundToWhole
    ? Math.round(raw)
    : Math.round(raw * 100) / 100;

  return Math.max(0.01, rounded);
}
