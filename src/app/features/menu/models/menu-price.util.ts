/**
 * Price helpers for menu items.
 *
 * The backend stores money as `decimal(18, 2)` with `PrecisionScale(18, 2,
 * false)` — trailing zeros are preserved, so `1.50` is valid but `1.555` is
 * not. The form control is therefore a string validated against
 * /^\d+(\.\d{1,2})?$/ and converted to a number only before sending.
 *
 * Currency is always PKR (backend Money.DefaultCurrency = "PKR"); it is
 * shown read-only and never derived from user input (D6, D5).
 */

const PRICE_PATTERN = /^\d+(\.\d{1,2})?$/;
// decimal(18,2): 16 integer digits + 2 fraction digits.
const MAX_INTEGER_DIGITS = 16;

export function parsePrice(value: string): number | null {
  const trimmed = value.trim();

  if (trimmed.length === 0 || !PRICE_PATTERN.test(trimmed)) {
    return null;
  }

  const [integerPart, fractionPart = ''] = trimmed.split('.');

  if (integerPart.length > MAX_INTEGER_DIGITS) {
    return null;
  }

  return Number(trimmed);
}

export function formatPrice(value: number): string {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

export function isValidPrice(value: string): boolean {
  const trimmed = value.trim();

  if (trimmed.length === 0 || !PRICE_PATTERN.test(trimmed)) {
    return false;
  }

  const [integerPart] = trimmed.split('.');

  return integerPart.length <= MAX_INTEGER_DIGITS;
}

export const DEFAULT_CURRENCY = 'PKR';
