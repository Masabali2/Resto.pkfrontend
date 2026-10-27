
/**
 * Visual tone of a restaurant status.
 *
 * `unknown` is used for every status the backend adds later, so a new status
 * is never presented as an active restaurant.
 */
export type RestaurantStatusTone = 'active' | 'paused' | 'closed' | 'unknown';

export interface RestaurantStatusView {
  /** Text shown to the user. */
  label: string;
  /** Tone used by the presentation layer. */
  tone: RestaurantStatusTone;
}

const KNOWN_STATUSES: Record<string, RestaurantStatusView> = {
  active: { label: 'Active', tone: 'active' },
  temporarilyclosed: { label: 'Temporarily closed', tone: 'paused' },
  inactive: { label: 'Inactive', tone: 'paused' },
  closed: { label: 'Closed', tone: 'closed' },
  suspended: { label: 'Suspended', tone: 'closed' }
};

/**
 * Maps the status returned by the API to a label and a tone.
 *
 * Known statuses are mapped deliberately. Unknown statuses keep the text
 * returned by the backend and fall back to the neutral `unknown` tone so an
 * unrecognised status is never shown as "Active".
 */
export function resolveRestaurantStatus(
  status: string | null | undefined
): RestaurantStatusView {
  const raw = (status ?? '').trim();
  const normalized = raw.toLowerCase().replace(/[\s_-]/g, '');
  const known = KNOWN_STATUSES[normalized];

  if (known) {
    return { ...known };
  }

  return {
    label: raw.length > 0 ? raw : 'Unknown',
    tone: 'unknown'
  };
}

/** True when the restaurant status means the restaurant is trading. */
export function isActiveRestaurantStatus(
  status: string | null | undefined
): boolean {
  return resolveRestaurantStatus(status).tone === 'active';
}
