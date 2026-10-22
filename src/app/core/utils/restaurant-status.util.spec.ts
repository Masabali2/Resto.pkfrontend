import {
  isActiveRestaurantStatus,
  resolveRestaurantStatus
} from './restaurant-status.util';

describe('resolveRestaurantStatus', () => {
  it('maps the known statuses of the backend', () => {
    expect(resolveRestaurantStatus('Active')).toEqual({
      label: 'Active',
      tone: 'active'
    });
    expect(resolveRestaurantStatus('TemporarilyClosed')).toEqual({
      label: 'Temporarily closed',
      tone: 'paused'
    });
    expect(resolveRestaurantStatus('Closed')).toEqual({
      label: 'Closed',
      tone: 'closed'
    });
  });

  it('keeps the text of an unknown status and never marks it as active', () => {
    const view = resolveRestaurantStatus('SeasonalOpening');

    expect(view.tone).toBe('unknown');
    expect(view.label).toBe('SeasonalOpening');
  });

  it('falls back to a neutral label when the backend sends no status', () => {
    expect(resolveRestaurantStatus(null)).toEqual({
      label: 'Unknown',
      tone: 'unknown'
    });
    expect(resolveRestaurantStatus('')).toEqual({
      label: 'Unknown',
      tone: 'unknown'
    });
  });
});

describe('isActiveRestaurantStatus', () => {
  it('is true only for the active status', () => {
    expect(isActiveRestaurantStatus('Active')).toBe(true);
    expect(isActiveRestaurantStatus(' active ')).toBe(true);
  });

  it('is false for every other status', () => {
    expect(isActiveRestaurantStatus('TemporarilyClosed')).toBe(false);
    expect(isActiveRestaurantStatus('Closed')).toBe(false);
    expect(isActiveRestaurantStatus('SomethingNew')).toBe(false);
    expect(isActiveRestaurantStatus(null)).toBe(false);
  });
});
