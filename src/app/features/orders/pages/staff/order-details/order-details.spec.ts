import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { signal } from '@angular/core';
import { ActiveRestaurantStateService } from '../../../../../core/services/active-restaurant-state.service';
import { OrderDetails } from './order-details';

describe('OrderDetails', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrderDetails],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'order-123' } } } },
        { provide: ActiveRestaurantStateService, useValue: { restaurant: signal(null) } }
      ]
    }).compileComponents();
  });

  it('renders an honest unavailable state until order API integration exists', () => {
    const fixture = TestBed.createComponent(OrderDetails);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Order details');
    expect(fixture.nativeElement.textContent).toContain('Order details are not connected yet');
    expect(fixture.nativeElement.querySelector('a[routerLink="/orders"]')).toBeTruthy();
  });
});
