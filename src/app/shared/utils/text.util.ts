/**
 * Small, pure text/number helpers shared across feature forms.
 */

/** Converts an empty string (or undefined) to `null` for API payloads. */
export function orNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();

  return trimmed && trimmed.length > 0 ? trimmed : null;
}

/**
 * Parses an optional numeric form value. Returns `null` for empty input and
 * `NaN`-safe numbers otherwise (invalid input yields `null`).
 */
export function parseOptionalNumber(
  value: string | number | null | undefined
): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return null;
  }

  const parsed = Number(trimmed);

  return Number.isFinite(parsed) ? parsed : null;
}
