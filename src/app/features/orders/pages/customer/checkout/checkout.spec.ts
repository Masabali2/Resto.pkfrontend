import { TestBed } from '@angular/core/testing';
import { PublicCheckout } from './checkout';

describe('PublicCheckout', () => {
  it('shows supported checkout fields without enabling submission before integration', async () => {
    await TestBed.configureTestingModule({ imports: [PublicCheckout] }).compileComponents();
    const fixture = TestBed.createComponent(PublicCheckout);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Customer details');
    expect(fixture.nativeElement.textContent).toContain('Pickup');
    expect(fixture.nativeElement.textContent).toContain('Dine-in');
    expect(fixture.nativeElement.textContent).toContain('Delivery');
    expect(fixture.nativeElement.querySelector('button[disabled]')?.textContent).toContain('Place order');
    expect(fixture.nativeElement.querySelector('input:not([disabled])')).toBeNull();
  });
});
