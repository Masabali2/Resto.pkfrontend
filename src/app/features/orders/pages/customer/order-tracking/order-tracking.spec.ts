import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { PublicOrderStateService } from '../../../services/public-order-state.service';
import { PublicOrderTracking } from './order-tracking';

describe('PublicOrderTracking', () => {
  const tracking = {
    orderNumber: 'RST-2026-001',
    status: 'Preparing',
    totalAmount: 850,
    currency: 'PKR',
    items: [{ itemName: 'Chicken Burger', quantity: 1 }],
    createdAt: '2026-11-06T10:00:00Z',
    completedAt: null
  };

  function createRoute() {
    const params = convertToParamMap({
      slug: 'sample-restaurant',
      trackingToken: 'one-time-token'
    });
    return { snapshot: { paramMap: params }, paramMap: of(params) };
  }

  it('loads and renders the server-authoritative order status', async () => {
    const order = signal(tracking);
    const loading = signal(false);
    const error = signal<string | null>(null);
    const state = {
      trackingOrder: order.asReadonly(),
      trackingLoading: loading.asReadonly(),
      trackingError: error.asReadonly(),
      loadTracking: vi.fn(),
      setTrackingError: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [PublicOrderTracking],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: createRoute() },
        { provide: PublicOrderStateService, useValue: state }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(PublicOrderTracking);
    fixture.detectChanges();

    expect(state.loadTracking).toHaveBeenCalledWith('sample-restaurant', 'one-time-token');
    expect(fixture.nativeElement.textContent).toContain('RST-2026-001');
    expect(fixture.nativeElement.textContent).toContain('Preparing');
    expect(fixture.nativeElement.textContent).toContain('Chicken Burger');
    expect(fixture.nativeElement.textContent).not.toContain('Live tracking is not connected yet');
  });

  it('retries tracking with the route token after an error', async () => {
    const state = {
      trackingOrder: signal(null).asReadonly(),
      trackingLoading: signal(false).asReadonly(),
      trackingError: signal('Order could not be found.').asReadonly(),
      loadTracking: vi.fn(),
      setTrackingError: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [PublicOrderTracking],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: createRoute() },
        { provide: PublicOrderStateService, useValue: state }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(PublicOrderTracking);
    fixture.detectChanges();
    state.loadTracking.mockClear();

    const retryButton = fixture.nativeElement.querySelector('button');
    expect(retryButton?.textContent).toContain('Try again');
    retryButton.click();

    expect(state.loadTracking).toHaveBeenCalledWith('sample-restaurant', 'one-time-token');
  });
});
