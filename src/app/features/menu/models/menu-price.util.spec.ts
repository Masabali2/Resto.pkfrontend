import { describe, it, expect } from 'vitest';
import { parsePrice, formatPrice, isValidPrice, DEFAULT_CURRENCY } from './menu-price.util';

describe('parsePrice', () => {
  it('parses whole numbers', () => {
    expect(parsePrice('10')).toBe(10);
    expect(parsePrice('0')).toBe(0);
  });

  it('parses prices with up to 2 decimal places', () => {
    expect(parsePrice('12.50')).toBe(12.5);
    expect(parsePrice('12.5')).toBe(12.5);
    expect(parsePrice('0.99')).toBe(0.99);
    expect(parsePrice('1234.56')).toBe(1234.56);
  });

  it('trims whitespace', () => {
    expect(parsePrice('  12.50  ')).toBe(12.5);
  });

  it('rejects more than 2 decimal places', () => {
    expect(parsePrice('1.555')).toBeNull();
    expect(parsePrice('1.5555')).toBeNull();
  });

  it('rejects negatives', () => {
    expect(parsePrice('-1')).toBeNull();
    expect(parsePrice('-0.01')).toBeNull();
  });

  it('rejects non-numeric and empty values', () => {
    expect(parsePrice('')).toBeNull();
    expect(parsePrice('abc')).toBeNull();
    expect(parsePrice('12.3.4')).toBeNull();
    expect(parsePrice('.5')).toBeNull();
  });

  it('rejects values exceeding decimal(18,2) integer capacity', () => {
    expect(parsePrice('99999999999999999')).toBeNull(); // 17 integer digits
  });
});

describe('formatPrice', () => {
  it('formats as PKR currency with 2 decimals', () => {
    const result = formatPrice(1250);

    expect(result).toContain('1,250.00');
    expect(result).toContain('Rs');
  });

  it('preserves trailing zeros', () => {
    expect(formatPrice(1.5)).toContain('1.50');
  });
});

describe('isValidPrice', () => {
  it('accepts whole numbers and 2-dp prices', () => {
    expect(isValidPrice('10')).toBe(true);
    expect(isValidPrice('12.50')).toBe(true);
    expect(isValidPrice('0')).toBe(true);
  });

  it('rejects more than 2 decimal places, negatives, and non-numeric', () => {
    expect(isValidPrice('1.555')).toBe(false);
    expect(isValidPrice('-1')).toBe(false);
    expect(isValidPrice('abc')).toBe(false);
    expect(isValidPrice('')).toBe(false);
  });

  it('rejects values exceeding decimal(18,2) integer capacity', () => {
    expect(isValidPrice('99999999999999999')).toBe(false);
  });
});

describe('DEFAULT_CURRENCY', () => {
  it('is PKR', () => {
    expect(DEFAULT_CURRENCY).toBe('PKR');
  });
});
