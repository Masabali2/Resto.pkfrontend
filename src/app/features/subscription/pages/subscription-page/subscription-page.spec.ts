import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { vi } from 'vitest';
import { SubscriptionPage } from './subscription-page';
import { SubscriptionFlowService } from '../../services/subscription-flow.service';
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

describe('SubscriptionPage', () => {
  let fixture: ComponentFixture<SubscriptionPage>;
  let startTrial: ReturnType<typeof vi.fn>;
  let stub: {
    state: ReturnType<typeof signal<SubscriptionState | null>>;
    loading: ReturnType<typeof signal<boolean>>;
    trialLoading: ReturnType<typeof signal<boolean>>;
    trialError: ReturnType<typeof signal<string | null>>;
  };

  beforeEach(async () => {
    startTrial = vi.fn();

    stub = {
      state: signal<SubscriptionState | null>(state()),
      loading: signal(false),
      trialLoading: signal(false),
      trialError: signal<string | null>(null)
    };

    await TestBed.configureTestingModule({
      imports: [SubscriptionPage],
      providers: [
        provideRouter([]),
        {
          provide: SubscriptionFlowService,
          useValue: {
            state: stub.state,
            loading: stub.loading,
            trialLoading: stub.trialLoading,
            trialError: stub.trialError,
            startTrial
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SubscriptionPage);
  });

  it('renders the plan-selection experience of the active workspace', () => {
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('Plan your workspace');
    expect(element.textContent).toContain('Activate your workspace');
    expect(element.textContent).toContain('30-day free trial');
    expect(element.textContent).toContain('Start my 30-day free trial');
    expect(element.textContent).toContain('Available plans');
    expect(element.textContent).toContain('Free Trial');
    expect(element.textContent).toContain('Up to 5 staff members');
  });

  it('shows the verified workspace status', () => {
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('Workspace pending activation');
    expect(element.textContent).toContain('Start your 30-day free trial');
  });

  it('does not offer a second trial when it was already used', () => {
    stub.state.set(
      state({
        tenantStatus: 'Active',
        hasSubscription: true,
        subscription: {
          id: 'subscription-1',
          planId: 'plan-1',
          planName: 'Free Trial',
          status: 'Trial',
          startDate: '2026-01-01T00:00:00Z',
          endDate: '2026-01-31T00:00:00Z',
          autoRenew: false,
          isEntitled: true,
          maxStaff: 5,
          maxMenuItems: 100,
          maxOrdersPerMonth: 500
        },
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

    expect(element.textContent).toContain('Free trial active');
    expect(element.textContent).not.toContain('Start my 30-day free trial');
  });

  it('starts the trial through the shared flow', () => {
    fixture.detectChanges();

    const button = (
      fixture.nativeElement as HTMLElement
    ).querySelector<HTMLButtonElement>(
      'app-subscription-offer app-button button'
    );

    button?.click();

    expect(startTrial).toHaveBeenCalled();
  });
});
