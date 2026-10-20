import type { ValidationError } from '../../../core/models/api-response.model';

/**
 * Shared error-handling helpers for the menu feature forms.
 *
 * The three menu forms (menu, category, item) validate and display errors in
 * exactly the same way; only their labels, pattern messages, field maps and
 * fallback sentences differ. Those differences stay in each form; everything
 * genuinely identical lives here.
 */

/** Minimal shape of a typed reactive form control used by these helpers. */
export interface FieldErrorControl {
  readonly touched: boolean;
  hasError(errorCode: string): boolean;
}

export interface FieldErrorMessageOptions<TField extends string> {
  readonly control: FieldErrorControl;
  /** Whether the user has attempted to submit the form. */
  readonly submitted: boolean;
  /** Backend validation message previously mapped to this field, if any. */
  readonly apiError: string | undefined;
  /** Human-readable label per field (e.g. "Menu name"). */
  readonly labels: Readonly<Record<string, string>>;
  /** Optional per-field messages for `pattern` validator failures. */
  readonly patternMessages?: Readonly<Partial<Record<TField, string>>>;
}

/**
 * Resolves the single message to show under a field, or `null` when no
 * message applies. Priority: backend error > required > maxlength > pattern.
 */
export function fieldErrorMessage<TField extends string>(
  field: TField,
  options: FieldErrorMessageOptions<TField>
): string | null {
  const { control, submitted, apiError, labels, patternMessages } = options;

  if (!(control.touched || submitted)) {
    return null;
  }

  if (apiError) {
    return apiError;
  }

  if (control.hasError('required')) {
    return `${labels[field] ?? field} is required.`;
  }

  if (control.hasError('maxlength')) {
    return `${labels[field] ?? field} is too long.`;
  }

  if (control.hasError('pattern')) {
    return patternMessages?.[field] ?? null;
  }

  return null;
}

/**
 * Normalizes a backend DTO field name (`NameDto`, `DisplayOrder`, …) to the
 * matching frontend control key using the given lowercase map. Returns `null`
 * for fields that have no corresponding control.
 */
export function normalizeApiField(
  field: string,
  map: Readonly<Record<string, string>>
): string | null {
  const normalized = field.replace(/Dto$/i, '').toLowerCase();

  return map[normalized] ?? null;
}

export interface MappedValidationErrors {
  /** Backend field → control-name errors, first message wins. */
  readonly fieldErrors: Record<string, string>;
  /** Errors whose backend field could not be mapped to a control. */
  readonly unmappedErrors: ValidationError[];
}

/** Maps a backend `errors` array onto control names, keeping the rest. */
export function mapValidationErrors(
  errors: readonly ValidationError[] | null | undefined,
  map: Readonly<Record<string, string>>
): MappedValidationErrors {
  const fieldErrors: Record<string, string> = {};
  const unmappedErrors: ValidationError[] = [];

  for (const item of errors ?? []) {
    const key = normalizeApiField(item.field, map);

    if (key === null) {
      unmappedErrors.push(item);
    } else if (!fieldErrors[key]) {
      fieldErrors[key] = item.message;
    }
  }

  return { fieldErrors, unmappedErrors };
}

/**
 * Options describing how a failed (but HTTP-successful) API response should
 * be surfaced on a form.
 */
export interface ApplyApiErrorsOptions {
  readonly map: Readonly<Record<string, string>>;
  readonly generalFallback: string;
  readonly notifyFallback: string;
}

/**
 * Result of applying a failed API response to a form: the mapped control
 * errors plus the best available general message. When nothing could be
 * mapped, `notifyUser` is `true` so the caller can surface the problem as a
 * toast instead of letting it disappear silently.
 */
export interface AppliedApiErrors {
  readonly fieldErrors: Record<string, string>;
  readonly generalError: string;
  readonly notifyUser: boolean;
}

/** Single implementation of "show backend validation errors on the form". */
export function applyApiValidationErrors(
  response: {
    message: string | null;
    errors: ValidationError[] | null;
  },
  options: ApplyApiErrorsOptions
): AppliedApiErrors {
  const { fieldErrors, unmappedErrors } = mapValidationErrors(
    response.errors,
    options.map
  );

  const generalError =
    response.message ??
    Object.values(fieldErrors)[0] ??
    unmappedErrors[0]?.message ??
    options.generalFallback;

  return {
    fieldErrors,
    generalError,
    notifyUser:
      Object.keys(fieldErrors).length === 0 && unmappedErrors.length === 0
  };
}


