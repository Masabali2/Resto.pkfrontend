import { buildRestaurantInitials } from './restaurant-initials.util';

describe('buildRestaurantInitials', () => {
  it('derives the initials from the real restaurant name', () => {
    expect(buildRestaurantInitials('Brewed & Co.')).toBe('BC');
    expect(buildRestaurantInitials('Karachi Darbar')).toBe('KD');
    expect(buildRestaurantInitials('chef & grill')).toBe('CG');
  });

  it('uses the first letter of a single word name', () => {
    expect(buildRestaurantInitials('Tandoor')).toBe('T');
  });

  it('falls back to a generic mark for a blank name', () => {
    expect(buildRestaurantInitials('')).toBe('R');
    expect(buildRestaurantInitials('   ')).toBe('R');
    expect(buildRestaurantInitials(null)).toBe('R');
    expect(buildRestaurantInitials(undefined)).toBe('R');
  });

  it('never returns more than two letters', () => {
    expect(buildRestaurantInitials('The Very Best Grill House')).toBe('TV');
  });
});
