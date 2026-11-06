import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { PublicOrderConfirmation } from './order-confirmation';

describe('PublicOrderConfirmation', () => {
  it('does not invent order details or encourage a duplicate order', async () => {
    history.replaceState({}, '', '/');
    const route = {
      snapshot: { paramMap: convertToParamMap({ slug: 'sample-restaurant' }) },
      paramMap: of(convertToParamMap({ slug: 'sample-restaurant' }))
    };

    await TestBed.configureTestingModule({
      imports: [PublicOrderConfirmation],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: route }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(PublicOrderConfirmation);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Order confirmation unavailable');
    expect(fixture.nativeElement.textContent).toContain('do not place the order again');
    expect(fixture.nativeElement.querySelector('.order-number')).toBeNull();
    expect(fixture.nativeElement.querySelector('.tracking-token')).toBeNull();
  });
});