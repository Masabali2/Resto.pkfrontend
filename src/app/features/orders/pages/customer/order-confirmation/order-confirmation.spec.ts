import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { PublicOrderConfirmation } from './order-confirmation';

describe('PublicOrderConfirmation', () => {
  it('does not invent an order number or expose a tracking token', async () => {
    await TestBed.configureTestingModule({
      imports: [PublicOrderConfirmation],
      providers: [provideRouter([])]
    }).compileComponents();

    const fixture = TestBed.createComponent(PublicOrderConfirmation);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Your order confirmation will appear here');
    expect(fixture.nativeElement.textContent).toContain('issued once');
    expect(fixture.nativeElement.querySelector('.order-number')).toBeNull();
    expect(fixture.nativeElement.querySelector('.tracking-token')).toBeNull();
  });
});
