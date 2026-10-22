
/**
 * Formats the location of a restaurant for the navbar.
 *
 * Missing parts are dropped so the result never contains empty segments.
 */
export function formatRestaurantLocation(
  city: string | null | undefined,
  country: string | null | undefined
): string {
  return [city, country]
    .map(part => (part ?? '').trim())
    .filter(part => part.length > 0)
    .join(', ');
}
