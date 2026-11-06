import { TestBed } from '@angular/core/testing';
import { PublicCart } from './cart';

describe('PublicCart', () => {
  it('renders an honest empty cart without fabricated order items', async () => {
    await TestBed.configureTestingModule({ imports: [PublicCart] }).compileComponents();
    const fixture = TestBed.createComponent(PublicCart);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Your cart is empty');
    expect(fixture.nativeElement.querySelectorAll('.cart-item')).toHaveLength(0);
    expect(fixture.nativeElement.textContent).toContain('API integration');
  });
});
