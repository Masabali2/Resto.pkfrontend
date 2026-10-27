
/**
 * Builds the two letter avatar initials of a restaurant name.
 *
 * The initials are derived from the name returned by the API, never from a
 * hard coded value, so a renamed restaurant keeps showing the right mark.
 */
export function buildRestaurantInitials(name: string | null | undefined): string {
  const parts = (name ?? '')
    .split(/[\s@._\-/&+]+/)
    .map(part => part.trim())
    .filter(part => part.length > 0);

  if (parts.length === 0) {
    return 'R';
  }

  const initials = parts
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('');

  return initials || 'R';
}
