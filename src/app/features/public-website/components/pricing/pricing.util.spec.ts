import type { SubscriptionPlan } from '../../../subscription/models/subscription-plan.model';
import { groupPlansByCode } from '../../../subscription/models/subscription-plan.model';
import {
  annualSavingsLabel,
  annualSavingsPercent,
  isPaidPlanGroup,
  listCurrencies,
  monthlyEquivalent,
  paidGroupsForCurrency,
  REQUIRED_PLAN_CODES,
} from './pricing.util';

function plan(
  overrides: Partial<SubscriptionPlan> &
    Pick<SubscriptionPlan, 'id' | 'code' | 'billingInterval'>,
): SubscriptionPlan {
  return {
    id: overrides.id,
    code: overrides.code,
    name: overrides.name ?? overrides.code,
    description: overrides.description ?? null,
    price: overrides.price ?? 0,
    currency: overrides.currency ?? 'PKR',
    billingInterval: overrides.billingInterval,
    maxStaff: overrides.maxStaff ?? 5,
    maxMenuItems: overrides.maxMenuItems ?? 50,
    maxOrdersPerMonth: overrides.maxOrdersPerMonth ?? 500,
    isActive: overrides.isActive ?? true,
  };
}

/** The paid catalogue currently published by the backend, plus Free Trial. */
const catalogue: SubscriptionPlan[] = [
  plan({ id: 's-m', code: 'starter', billingInterval: 'Monthly', price: 1499 }),
  plan({ id: 's-y', code: 'starter', billingInterval: 'Yearly', price: 14990 }),
  plan({ id: 'p-m', code: 'professional', billingInterval: 'Monthly', price: 3999 }),
  plan({ id: 'p-y', code: 'professional', billingInterval: 'Yearly', price: 39990 }),
  plan({ id: 'b-m', code: 'business', billingInterval: 'Monthly', price: 7999 }),
  plan({ id: 'b-y', code: 'business', billingInterval: 'Yearly', price: 79990 }),
  plan({
    id: 'trial',
    code: 'free-trial',
    billingInterval: 'Monthly',
    price: 0,
    name: 'Free Trial',
  }),
];

describe('pricing catalogue helpers', () => {
  it('keeps only the three approved paid plans and excludes Free Trial', () => {
    const groups = paidGroupsForCurrency(
      groupPlansByCode(catalogue),
      'PKR',
    );

    expect(groups.map((group) => group.code)).toEqual([
      'starter',
      'professional',
      'business',
    ]);
    expect(groups).toHaveLength(REQUIRED_PLAN_CODES.length);
    expect(groups.some((group) => !isPaidPlanGroup(group))).toBe(false);
  });

  it('lists PKR first and never invents a currency', () => {
    const groups = groupPlansByCode([
      ...catalogue,
      plan({ id: 'usd-m', code: 'starter', billingInterval: 'Monthly', price: 19, currency: 'USD' }),
      plan({ id: 'usd-y', code: 'starter', billingInterval: 'Yearly', price: 190, currency: 'USD' }),
      plan({ id: 'eur-free', code: 'starter', billingInterval: 'Monthly', price: 0, currency: 'EUR' }),
    ]);

    expect(listCurrencies(groups)).toEqual(['PKR', 'USD']);
  });

  it('never pairs a monthly row with a yearly row of another currency', () => {
    const groups = groupPlansByCode([
      plan({ id: 'pkr-m', code: 'starter', billingInterval: 'Monthly', price: 1499 }),
      plan({ id: 'usd-y', code: 'starter', billingInterval: 'Yearly', price: 190, currency: 'USD' }),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups.find((group) => group.currency === 'PKR')?.yearly).toBeNull();
    expect(groups.find((group) => group.currency === 'USD')?.monthly).toBeNull();
  });
});

describe('annual savings', () => {
  it('derives the real 16.67% saving from the published prices', () => {
    const starter = groupPlansByCode(catalogue).find(
      (group) => group.code === 'starter',
    );

    expect(starter).toBeDefined();
    expect(annualSavingsPercent(starter!)).toBe(16.67);
    expect(annualSavingsLabel([starter!])).toMatch(/^Save 16[.,]67%$/);
  });

  it('does not claim a discount when the yearly price is not cheaper', () => {
    const group = groupPlansByCode([
      plan({ id: 'm', code: 'starter', billingInterval: 'Monthly', price: 1499 }),
      plan({ id: 'y', code: 'starter', billingInterval: 'Yearly', price: 17988 }),
    ])[0];

    expect(annualSavingsPercent(group)).toBeNull();
  });

  it('says "up to" when plans publish different real savings', () => {
    const groups = groupPlansByCode([
      ...catalogue,
      plan({ id: 'legacy-m', code: 'legacy', billingInterval: 'Monthly', price: 1000 }),
      plan({ id: 'legacy-y', code: 'legacy', billingInterval: 'Yearly', price: 10800 }),
    ]);

    expect(annualSavingsLabel(groups)).toMatch(/^Save up to 16[.,]67%$/);
  });
});

describe('monthlyEquivalent', () => {
  it('derives the monthly equivalent from the yearly total', () => {
    const starter = groupPlansByCode(catalogue).find(
      (group) => group.code === 'starter',
    )!;

    expect(monthlyEquivalent(starter)).toMatch(/1[.,]249/);
  });

  it('returns null when no yearly price exists', () => {
    const group = groupPlansByCode([
      plan({ id: 'm', code: 'starter', billingInterval: 'Monthly', price: 1499 }),
    ])[0];

    expect(monthlyEquivalent(group)).toBeNull();
  });
});
