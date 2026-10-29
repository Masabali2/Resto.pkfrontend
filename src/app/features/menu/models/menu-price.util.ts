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
// Domain maximum amount (Money.New) is 1,000,000,000 PKR.
const MAX_AMOUNT = 1_000_000_000;
const MAX_INTEGER_DIGITS = 10;

export function parsePrice(value: string): number | null {
  const trimmed = value.trim();

  if (trimmed.length === 0 || !PRICE_PATTERN.test(trimmed)) {
    return null;
  }

  const [integerPart] = trimmed.split('.');

  if (integerPart.length > MAX_INTEGER_DIGITS) {
    return null;
  }

  const amount = Number(trimmed);

  if (amount > MAX_AMOUNT) {
    return null;
  }

  return amount;
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

  if (integerPart.length > MAX_INTEGER_DIGITS) {
    return false;
  }

  return Number(trimmed) <= MAX_AMOUNT;
}

export const DEFAULT_CURRENCY = 'PKR';
