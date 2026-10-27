import { TestBed } from '@angular/core/testing';
import { RestaurantSelector } from './restaurant-selector';
import type { RestaurantDto } from '../../../../models/restaurant.model';

function buildRestaurant(
  overrides: Partial<RestaurantDto> = {}
): RestaurantDto {
  return {
    id: 'restaurant-a',
    tenantId: 'tenant-1',
    name: 'Brewed & Co.',
    description: null,
    phone: null,
    email: null,
    addressLine1: 'Main Road',
    addressLine2: null,
    city: 'Lahore',
    country: 'Pakistan',
    timeZone: 'Asia/Karachi',
    status: 'Active',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: null,
    ...overrides
  };
}

describe('RestaurantSelector', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<RestaurantSelector>>;
  let component: RestaurantSelector;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RestaurantSelector]
    }).compileComponents();

    fixture = TestBed.createComponent(RestaurantSelector);
    component = fixture.componentInstance;
  });

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  it('stays closed until the trigger is used', () => {
    fixture.componentRef.setInput('restaurants', [
      buildRestaurant({ id: 'restaurant-a' }),
      buildRestaurant({ id: 'restaurant-b' })
    ]);
    fixture.componentRef.setInput('selectedId', 'restaurant-a');
    fixture.detectChanges();

    expect(element().querySelector('.selector-menu')).toBeNull();

    element().querySelector<HTMLButtonElement>('.selector-trigger')?.click();
    fixture.detectChanges();

    expect(element().querySelector('.selector-menu')).toBeTruthy();
  });

  it('shows the real name and the metadata of every restaurant', () => {
    fixture.componentRef.setInput('restaurants', [
      buildRestaurant({ id: 'restaurant-a', name: 'Brewed & Co.' }),
      buildRestaurant({
        id: 'restaurant-b',
        name: 'Karachi Darbar',
        city: 'Karachi',
        status: 'TemporarilyClosed'
      })
    ]);
    fixture.componentRef.setInput('selectedId', 'restaurant-a');
    fixture.detectChanges();

    element().querySelector<HTMLButtonElement>('.selector-trigger')?.click();
    fixture.detectChanges();

    const options = element().querySelectorAll('.selector-option');

    expect(options.length).toBe(2);
    expect(options[0].textContent).toContain('Brewed & Co.');
    expect(options[0].textContent).toContain('Lahore, Pakistan · Active');
    expect(options[1].textContent).toContain('Karachi Darbar');
    expect(options[1].textContent).toContain('Karachi, Pakistan · Temporarily closed');
    expect(options[0].getAttribute('aria-selected')).toBe('true');
  });

  it('reports the restaurant the user picked', () => {
    const picked: string[] = [];

    component.select.subscribe(value => picked.push(value));

    fixture.componentRef.setInput('restaurants', [
      buildRestaurant({ id: 'restaurant-a' }),
      buildRestaurant({ id: 'restaurant-b' })
    ]);
    fixture.componentRef.setInput('selectedId', 'restaurant-a');
    fixture.detectChanges();

    element().querySelector<HTMLButtonElement>('.selector-trigger')?.click();
    fixture.detectChanges();

    const options = element().querySelectorAll<HTMLButtonElement>(
      '.selector-option'
    );

    options[1].click();
    fixture.detectChanges();

    expect(picked).toEqual(['restaurant-b']);
    expect(element().querySelector('.selector-menu')).toBeNull();
  });

  it('closes the menu with the escape key', () => {
    fixture.componentRef.setInput('restaurants', [
      buildRestaurant({ id: 'restaurant-a' }),
      buildRestaurant({ id: 'restaurant-b' })
    ]);
    fixture.componentRef.setInput('selectedId', 'restaurant-a');
    fixture.detectChanges();

    element().querySelector<HTMLButtonElement>('.selector-trigger')?.click();
    fixture.detectChanges();

    expect(element().querySelector('.selector-menu')).toBeTruthy();

    element()
      .querySelector('.restaurant-selector')
      ?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(element().querySelector('.selector-menu')).toBeNull();
  });

  it('disables the trigger when the tenant owns a single restaurant', () => {
    fixture.componentRef.setInput('restaurants', [buildRestaurant()]);
    fixture.componentRef.setInput('selectedId', 'restaurant-a');
    fixture.detectChanges();

    const trigger = element().querySelector<HTMLButtonElement>(
      '.selector-trigger'
    );

    expect(trigger?.disabled).toBe(true);
  });
});
