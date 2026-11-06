import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { PublicOrderTracking } from './order-tracking';

describe('PublicOrderTracking', () => {
  it('labels lifecycle stages without claiming a live order status', async () => {
    await TestBed.configureTestingModule({
      imports: [PublicOrderTracking],
      providers: [provideRouter([])]
    }).compileComponents();

    const fixture = TestBed.createComponent(PublicOrderTracking);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Live tracking is not connected yet');
    expect(fixture.nativeElement.textContent).toContain('not the current status of an order');
    expect(fixture.nativeElement.querySelector('.current-status')).toBeNull();
  });
});
