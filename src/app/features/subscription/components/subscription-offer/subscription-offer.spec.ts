import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { SubscriptionOffer } from './subscription-offer';
import type { SubscriptionState } from '../../models/subscription-status.model';

function state(overrides: Partial<SubscriptionState> = {}): SubscriptionState {
  return {
    tenantId: 'tenant-1',
    tenantName: 'Resto One',
    tenantStatus: 'Pending',
    hasSubscription: false,
    subscription: null,
    trial: {
      eligible: true,
      trialUsed: false,
      trialDurationDays: 30,
      reason: null
    },
    availablePlans: [
      {
        id: 'plan-1',
        code: 'free-trial',
        name: 'Free Trial',
        description: '30-day free trial for a new Resto.pk workspace.',
        price: 0,
        currency: 'PKR',
        billingInterval: 'Monthly',
        maxStaff: 5,
        maxMenuItems: 100,
        maxOrdersPerMonth: 500,
        isActive: true
      }
    ],
    serverTimeUtc: '2026-01-02T00:00:00Z',
    ...overrides
  };
}

describe('SubscriptionOffer', () => {
  let fixture: ComponentFixture<SubscriptionOffer>;
  let component: SubscriptionOffer;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubscriptionOffer]
    }).compileComponents();

    fixture = TestBed.createComponent(SubscriptionOffer);
    component = fixture.componentInstance;
  });

  it('offers the free trial when the workspace is eligible', () => {
    fixture.componentRef.setInput('state', state());
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('Activate your workspace');
    expect(element.textContent).toContain('30-day free trial');
    expect(element.textContent).toContain('Start my 30-day free trial');
    expect(element.textContent).toContain('No card, no payment details');
  });

  it('states honestly that a consumed trial cannot be replayed', () => {
    fixture.componentRef.setInput(
      'state',
      state({
        trial: {
          eligible: false,
          trialUsed: true,
          trialDurationDays: 30,
          reason: 'The free trial has already been used for this workspace.'
        }
      })
    );
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('Your free trial has been used');
    expect(element.textContent).toContain(
      'The free trial has already been used for this workspace.'
    );
    expect(element.textContent).not.toContain('Start my 30-day free trial');
  });

  it('emits the trial request', () => {
    fixture.componentRef.setInput('state', state());
    fixture.detectChanges();

    let started = false;

    component.startTrial.subscribe(() => {
      started = true;
    });

    const button = (
      fixture.nativeElement as HTMLElement
    ).querySelector<HTMLButtonElement>('.button');

    button?.click();

    expect(started).toBe(true);
  });

  it('renders the available plans on demand', () => {
    fixture.componentRef.setInput('state', state());
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).not.toContain('Available plans');

    const toggle = element.querySelector<HTMLButtonElement>('.link-button');

    toggle?.click();
    fixture.detectChanges();

    expect(element.textContent).toContain('Available plans');
    expect(element.textContent).toContain('Up to 5 staff members');
  });
});
