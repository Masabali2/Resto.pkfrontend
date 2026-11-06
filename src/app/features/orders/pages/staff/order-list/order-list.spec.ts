import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActiveRestaurantStateService } from '../../../../../core/services/active-restaurant-state.service';
import type { RestaurantDto } from '../../../../../core/models/restaurant.model';
import { OrderList } from './order-list';

describe('OrderList', () => {
  const restaurant = signal<RestaurantDto | null>({
    id: 'restaurant-1',
    tenantId: 'tenant-1',
    name: 'Test Restaurant',
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
    updatedAt: null
  });
  const state = signal<'resolved' | 'loading' | 'empty' | 'error' | 'forbidden'>('resolved');
  const errorMessage = signal<string | null>(null);

  beforeEach(async () => {
    restaurant.set({
      id: 'restaurant-1',
      tenantId: 'tenant-1',
      name: 'Test Restaurant',
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
      updatedAt: null
    });
    state.set('resolved');
    errorMessage.set(null);

    await TestBed.configureTestingModule({
      imports: [OrderList],
      providers: [
        {
          provide: ActiveRestaurantStateService,
          useValue: {
            restaurant: restaurant.asReadonly(),
            state: state.asReadonly(),
            errorMessage: errorMessage.asReadonly(),
            refresh: () => undefined
          }
        }
      ]
    }).compileComponents();
  });

  it('renders the selected restaurant and a clear UI-only state', () => {
    const fixture = TestBed.createComponent(OrderList);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Test Restaurant');
    expect(fixture.nativeElement.textContent).toContain('Order list is ready');
    expect(fixture.nativeElement.textContent).toContain(
      'Order data will appear here when the order service is connected.'
    );
  });

  it('changes the selected status filter accessibly', () => {
    const fixture = TestBed.createComponent(OrderList);
    fixture.detectChanges();

    const preparing = Array.from(
      fixture.nativeElement.querySelectorAll('button')
    ).find((button: Element) => button.textContent?.trim() === 'Preparing') as HTMLButtonElement;

    expect(preparing).toBeTruthy();
    preparing.click();
    fixture.detectChanges();

    expect(preparing.getAttribute('aria-pressed')).toBe('true');
    expect(fixture.nativeElement.textContent).toContain(
      'The preparing order view will be available when order data is connected.'
    );
  });

  it('shows a loading state while restaurant context is loading', () => {
    state.set('loading');

    const fixture = TestBed.createComponent(OrderList);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Loading your restaurant');
  });

  it('shows a permission state when the selected restaurant is forbidden', () => {
    state.set('forbidden');

    const fixture = TestBed.createComponent(OrderList);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Restaurant access unavailable');
  });

  it('shows a selection state when the tenant has no restaurant', () => {
    restaurant.set(null);
    state.set('empty');

    const fixture = TestBed.createComponent(OrderList);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Select a restaurant');
  });

  it('offers retry when restaurant context fails to load', () => {
    state.set('error');
    errorMessage.set('Unable to load restaurant.');

    const fixture = TestBed.createComponent(OrderList);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Unable to load restaurant.');
    expect(fixture.nativeElement.querySelector('.retry-button')).toBeTruthy();
  });

  it('does not render fabricated order records or analytics', () => {
    const fixture = TestBed.createComponent(OrderList);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(fixture.nativeElement.textContent).not.toContain('Total revenue');
    expect(fixture.nativeElement.textContent).not.toContain('Average order');
  });
});
