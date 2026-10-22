import {
  daysBetween,
  formatPlanPrice,
  formatUtcDate,
  presentPlan,
  resolveSubscriptionStatus
} from './subscription-status.util';
import type { SubscriptionPlan } from '../models/subscription-plan.model';
import type { SubscriptionState } from '../models/subscription-status.model';

function plan(overrides: Partial<SubscriptionPlan> = {}): SubscriptionPlan {
  return {
    id: 'plan-1',
    name: 'Free Trial',
    description: '30-day free trial for a new Resto.pk workspace.',
    price: 0,
    currency: 'PKR',
    billingInterval: 'Monthly',
    maxStaff: 5,
    maxMenuItems: 100,
    maxOrdersPerMonth: 500,
    isActive: true,
    ...overrides
  };
}

function state(overrides: Partial<SubscriptionState> = {}): SubscriptionState {
  return {
    tenantId: 'tenant-1',
    tenantName: 'Resto One',
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
    },
    availablePlans: [plan()],
    serverTimeUtc: '2026-01-02T00:00:00Z',
    ...overrides
  };
}

describe('subscription status helpers', () => {
  it('formats a price with the currency reported by the backend', () => {
    expect(formatPlanPrice(0, 'PKR')).toContain('0');
    expect(formatPlanPrice(4999, 'PKR')).toContain('4,999');
  });

  it('falls back to a plain amount for an unknown currency', () => {
    expect(formatPlanPrice(150, 'XXXX')).toContain('150');
  });

  it('formats a UTC date and rejects invalid input', () => {
    expect(formatUtcDate('2026-01-31T00:00:00Z')).not.toBeNull();
    expect(formatUtcDate(null)).toBeNull();
    expect(formatUtcDate('not-a-date')).toBeNull();
  });

  it('derives the remaining days from the server timestamps', () => {
    expect(
      daysBetween('2026-01-01T00:00:00Z', '2026-01-31T00:00:00Z')
    ).toBe(30);

    expect(
      daysBetween('2026-01-31T00:00:00Z', '2026-01-01T00:00:00Z')
    ).toBe(0);
  });

  it('presents the real limits of a plan', () => {
    const presented = presentPlan(plan({ maxStaff: 0 }));

    expect(presented.isFree).toBe(true);
    expect(presented.formattedPrice).toBe('Free');
    expect(presented.limits).toContain('Unlimited staff members');
  });

  it('marks a paid plan as not free', () => {
    const presented = presentPlan(plan({ price: 4999 }));

    expect(presented.isFree).toBe(false);
    expect(presented.formattedPrice).not.toBe('Free');
  });
});

describe('resolveSubscriptionStatus', () => {
  it('reports an unavailable state when nothing could be read', () => {
    const status = resolveSubscriptionStatus(null, false);

    expect(status.kind).toBe('none');
    expect(status.canUseProtectedFeatures).toBe(false);
    expect(status.canStartTrial).toBe(false);
  });

  it('reports a running trial as entitled', () => {
    const status = resolveSubscriptionStatus(state(), false);

    expect(status.kind).toBe('trial');
    expect(status.canUseProtectedFeatures).toBe(true);
    expect(status.daysRemaining).toBe(29);
  });

  it('reports an expired trial without access', () => {
    const status = resolveSubscriptionStatus(
      state({
        subscription: {
          ...state().subscription!,
          isEntitled: false,
          endDate: '2026-01-01T00:00:00Z'
        }
      }),
      false
    );

    expect(status.kind).toBe('expired');
    expect(status.canUseProtectedFeatures).toBe(false);
    expect(status.daysRemaining).toBe(0);
  });

  it('reports a pending workspace with an unused trial', () => {
    const status = resolveSubscriptionStatus(
      state({
        tenantStatus: 'Pending',
        hasSubscription: false,
        subscription: null,
        trial: {
          eligible: true,
          trialUsed: false,
          trialDurationDays: 30,
          reason: null
        }
      }),
      false
    );

    expect(status.kind).toBe('pending');
    expect(status.canStartTrial).toBe(true);
    expect(status.canUseProtectedFeatures).toBe(false);
  });

  it('reports a workspace without any subscription', () => {
    const status = resolveSubscriptionStatus(
      state({
        hasSubscription: false,
        subscription: null,
        trial: {
          eligible: false,
          trialUsed: true,
          trialDurationDays: 30,
          reason: 'The free trial has already been used for this workspace.'
        }
      }),
      false
    );

    expect(status.kind).toBe('none');
    expect(status.canStartTrial).toBe(false);
    expect(status.detail).toContain('already been used');
  });
});
