import { formatRestaurantLocation } from './restaurant-location.util';

describe('formatRestaurantLocation', () => {
  it('joins city and country', () => {
    expect(formatRestaurantLocation('Lahore', 'Pakistan')).toBe('Lahore, Pakistan');
  });

  it('drops the parts the backend does not send', () => {
    expect(formatRestaurantLocation('Lahore', null)).toBe('Lahore');
    expect(formatRestaurantLocation(null, 'Pakistan')).toBe('Pakistan');
    expect(formatRestaurantLocation('  ', 'Pakistan')).toBe('Pakistan');
  });

  it('returns an empty string when nothing is known', () => {
    expect(formatRestaurantLocation(null, null)).toBe('');
    expect(formatRestaurantLocation(undefined, undefined)).toBe('');
  });
});
